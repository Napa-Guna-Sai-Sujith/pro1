function matches(item, query) {
  if (!query) return true;
  for (const key in query) {
    if (key === "$or") {
      if (!Array.isArray(query.$or)) return false;
      return query.$or.some(subQuery => matches(item, subQuery));
    }
    if (key === "$text") {
      const search = query.$text.$search ? query.$text.$search.toLowerCase() : "";
      const text = `${item.name || ""} ${item.manufacturer || ""} ${item.batchNumber || ""}`.toLowerCase();
      return text.includes(search);
    }
    if (query[key] && typeof query[key] === "object" && !Array.isArray(query[key])) {
      const keys = Object.keys(query[key]);
      if (keys.includes("$ne")) {
        if (item[key] === query[key].$ne) return false;
      }
    } else {
      if (item[key] !== query[key]) return false;
    }
  }
  return true;
}

class MockQuery {
  constructor(data) {
    this.data = data;
  }
  sort(sortObj) {
    if (!sortObj) return this;
    const key = Object.keys(sortObj)[0];
    const order = sortObj[key];
    this.data.sort((a, b) => {
      if (a[key] < b[key]) return order === -1 ? 1 : -1;
      if (a[key] > b[key]) return order === -1 ? -1 : 1;
      return 0;
    });
    return this;
  }
  limit(n) {
    this.data = this.data.slice(0, n);
    return this;
  }
  then(resolve, reject) {
    return Promise.resolve(this.data).then(resolve, reject);
  }
  catch(reject) {
    return Promise.resolve(this.data).catch(reject);
  }
}

class MockModel {
  constructor(initialData = []) {
    this.records = initialData;
  }
  async findOne(query) {
    const item = this.records.find(r => matches(r, query));
    if (!item) return null;
    return this._wrap(item);
  }
  find(query) {
    const matched = this.records.filter(r => matches(r, query));
    const cloned = JSON.parse(JSON.stringify(matched));
    return new MockQuery(cloned.map(r => this._wrap(r)));
  }
  async create(doc) {
    const cloned = JSON.parse(JSON.stringify(doc));
    if (!cloned.id && !cloned._id) {
      cloned._id = Math.random().toString(36).substring(2, 9);
    }
    this.records.push(cloned);
    return this._wrap(cloned);
  }
  async insertMany(docs) {
    const docsArray = Array.isArray(docs) ? docs : [docs];
    const cloned = JSON.parse(JSON.stringify(docsArray));
    cloned.forEach(c => {
      if (!c.id && !c._id) {
        c._id = Math.random().toString(36).substring(2, 9);
      }
    });
    this.records.push(...cloned);
    return cloned.map(r => this._wrap(r));
  }
  async deleteMany(query) {
    if (!query || Object.keys(query).length === 0) {
      this.records = [];
    } else {
      this.records = this.records.filter(r => !matches(r, query));
    }
    return { deletedCount: 0 };
  }
  _wrap(item) {
    const self = this;
    return new Proxy(item, {
      get(target, prop) {
        if (prop === "save") {
          return async function() {
            const idx = self.records.findIndex(r => {
              if (target.id && r.id) return r.id === target.id;
              if (target._id && r._id) return r._id === target._id;
              return false;
            });
            if (idx !== -1) {
              self.records[idx] = JSON.parse(JSON.stringify(target));
            } else {
              self.records.push(JSON.parse(JSON.stringify(target)));
            }
            return this;
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
  User: new MockModel(),
  Drug: new MockModel(),
  SmartContractCall: new MockModel(),
};
