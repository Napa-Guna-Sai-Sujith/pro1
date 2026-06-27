const db = require("../config/neonClient");

function camelToSnake(str) {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

function snakeToCamel(str) {
  return str.replace(/([-_][a-z])/g, group =>
    group.toUpperCase().replace('-', '').replace('_', '')
  );
}

class PgQuery {
  constructor(model, sql, values) {
    this.model = model;
    this.sql = sql;
    this.values = values;
    this.sortStr = "";
    this.limitStr = "";
  }

  sort(sortObj) {
    if (sortObj) {
      const key = Object.keys(sortObj)[0];
      const order = sortObj[key] === -1 ? "DESC" : "ASC";
      this.sortStr = ` ORDER BY ${camelToSnake(key)} ${order}`;
    }
    return this;
  }

  limit(n) {
    if (n !== undefined) {
      this.limitStr = ` LIMIT ${n}`;
    }
    return this;
  }

  async then(resolve, reject) {
    try {
      const finalSql = `${this.sql}${this.sortStr}${this.limitStr}`;
      const res = await db.query(finalSql, this.values);
      const docs = res.rows.map(row => this.model._wrap(this.model._fromDb(row)));
      return resolve(docs);
    } catch (err) {
      return reject(err);
    }
  }

  async catch(reject) {
    try {
      return await this;
    } catch (err) {
      return reject(err);
    }
  }
}

class PgModel {
  constructor(tableName, jsonFields = [], primaryKey = "id") {
    this.tableName = tableName;
    this.jsonFields = jsonFields;
    this.primaryKey = primaryKey;
  }

  _toDb(doc) {
    const row = {};
    for (const key in doc) {
      const dbKey = camelToSnake(key);
      if (this.jsonFields.includes(key)) {
        row[dbKey] = JSON.stringify(doc[key]);
      } else {
        row[dbKey] = doc[key];
      }
    }
    return row;
  }

  _fromDb(row) {
    if (!row) return null;
    const doc = {};
    for (const dbKey in row) {
      const key = snakeToCamel(dbKey);
      if (this.jsonFields.includes(key)) {
        try {
          doc[key] = typeof row[dbKey] === "string" ? JSON.parse(row[dbKey]) : row[dbKey];
        } catch {
          doc[key] = row[dbKey];
        }
      } else {
        doc[key] = row[dbKey];
      }
    }
    return doc;
  }

  _buildWhere(queryObj) {
    if (!queryObj || Object.keys(queryObj).length === 0) {
      return { clause: "", values: [] };
    }

    const clauses = [];
    const values = [];
    let idx = 1;

    for (const key in queryObj) {
      if (key === "$text") {
        const search = queryObj.$text.$search || "";
        clauses.push(`(name ILIKE $${idx} OR manufacturer ILIKE $${idx + 1} OR batch_number ILIKE $${idx + 2})`);
        values.push(`%${search}%`, `%${search}%`, `%${search}%`);
        idx += 3;
        continue;
      }
      
      if (key === "$or") {
        const orClauses = [];
        for (const sub of queryObj.$or) {
          const subClauses = [];
          for (const subKey in sub) {
            subClauses.push(`${camelToSnake(subKey)} = $${idx}`);
            values.push(sub[subKey]);
            idx++;
          }
          orClauses.push(`(${subClauses.join(" AND ")})`);
        }
        clauses.push(`(${orClauses.join(" OR ")})`);
        continue;
      }

      const val = queryObj[key];
      const dbKey = camelToSnake(key);

      if (val && typeof val === "object" && !Array.isArray(val)) {
        if ("$ne" in val) {
          clauses.push(`${dbKey} != $${idx}`);
          values.push(val.$ne);
          idx++;
        }
      } else {
        clauses.push(`${dbKey} = $${idx}`);
        values.push(val);
        idx++;
      }
    }

    return {
      clause: clauses.length > 0 ? " WHERE " + clauses.join(" AND ") : "",
      values
    };
  }

  async findOne(queryObj) {
    const { clause, values } = this._buildWhere(queryObj);
    const sql = `SELECT * FROM ${this.tableName}${clause} LIMIT 1`;
    const res = await db.query(sql, values);
    if (res.rows.length === 0) return null;
    return this._wrap(this._fromDb(res.rows[0]));
  }

  find(queryObj) {
    const { clause, values } = this._buildWhere(queryObj);
    const sql = `SELECT * FROM ${this.tableName}${clause}`;
    return new PgQuery(this, sql, values);
  }

  async create(doc) {
    const row = this._toDb(doc);
    const keys = Object.keys(row);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");
    const sql = `INSERT INTO ${this.tableName} (${keys.join(", ")}) VALUES (${placeholders}) RETURNING *`;
    const res = await db.query(sql, Object.values(row));
    return this._wrap(this._fromDb(res.rows[0]));
  }

  async insertMany(docs) {
    const docsArray = Array.isArray(docs) ? docs : [docs];
    const results = [];
    for (const doc of docsArray) {
      const created = await this.create(doc);
      results.push(created);
    }
    return results;
  }

  async deleteMany(queryObj) {
    const { clause, values } = this._buildWhere(queryObj);
    const sql = `DELETE FROM ${this.tableName}${clause}`;
    await db.query(sql, values);
    return { deletedCount: 0 };
  }

  _wrap(doc) {
    if (!doc) return null;
    const model = this;
    return new Proxy(doc, {
      get(target, prop) {
        if (prop === "save") {
          return async function() {
            const row = model._toDb(target);
            const pkCol = camelToSnake(model.primaryKey);
            const pkVal = target[model.primaryKey];
            
            const keys = Object.keys(row).filter(k => k !== pkCol);
            const sets = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
            const values = keys.map(k => row[k]);
            values.push(pkVal);
            
            const sql = `UPDATE ${model.tableName} SET ${sets} WHERE ${pkCol} = $${values.length} RETURNING *`;
            const res = await db.query(sql, values);
            if (res.rows.length === 0) {
              return await model.create(target);
            }
            return model._wrap(model._fromDb(res.rows[0]));
          };
        }
        return target[prop];
      },
      set(target, prop, value) {
        target[prop] = value;
        return true;
      }
    });
  }
}

module.exports = {
  User: new PgModel("users", [], "id"),
  Drug: new PgModel("drugs", ["supplyChain", "temperatureLogs"], "id"),
  SmartContractCall: new PgModel("smart_contract_calls", ["params"], "id")
};
