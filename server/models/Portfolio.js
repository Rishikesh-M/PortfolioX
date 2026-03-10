import { readDb, writeDb } from '../config/jsonDb.js';

const Portfolio = {
    async countDocuments() {
        const db = await readDb();
        return db.portfolios.length;
    },

    async insertMany(items) {
        const db = await readDb();
        const enrichedItems = items.map(item => ({
            ...item,
            createdAt: item.createdAt || new Date().toISOString(),
            updatedAt: item.updatedAt || new Date().toISOString()
        }));
        db.portfolios.push(...enrichedItems);
        await writeDb(db);
        return enrichedItems;
    },

    async find() {
        const db = await readDb();
        let results = [...db.portfolios];

        return {
            sort: function (criteria) {
                const key = Object.keys(criteria)[0];
                const direction = criteria[key];
                results.sort((a, b) => {
                    if (a[key] < b[key]) return direction;
                    if (a[key] > b[key]) return -direction;
                    return 0;
                });
                return this;
            },
            lean: function () { return this; },
            then: (resolve) => resolve(results)
        };
    },

    async findOne(query) {
        const db = await readDb();
        const { id, userId } = query;
        const p = id ? db.portfolios.find(item => item.id === id) : db.portfolios.find(item => item.userId === userId);

        const result = p ? this.enrich(p) : null;

        return {
            ...result,
            lean: function () { return result; },
            then: (resolve) => resolve(result)
        };
    },

    async findOneAndUpdate(query, update, options = {}) {
        const db = await readDb();
        const id = query.id || query.userId;
        const index = db.portfolios.findIndex(p => p.id === id || p.userId === id);

        let portfolio = index !== -1 ? db.portfolios[index] : null;

        if (portfolio) {
            if (update.$set) Object.assign(portfolio, update.$set);
            if (update.$pull) {
                for (const key in update.$pull) {
                    const filter = update.$pull[key];
                    portfolio[key] = portfolio[key].filter(item => {
                        for (const fKey in filter) {
                            if (item[fKey] !== filter[fKey]) return true;
                        }
                        return false;
                    });
                }
            }
            if (update.$push) {
                for (const key in update.$push) {
                    portfolio[key].push(update.$push[key]);
                }
            }
            if (!update.$set && !update.$pull && !update.$push) Object.assign(portfolio, update);

            portfolio.updatedAt = new Date().toISOString();
            await writeDb(db);
            return this.enrich(portfolio);
        } else if (options.upsert) {
            const data = update.$set || update;
            const newItem = {
                ...data,
                id: query.id || data.id,
                userId: query.userId || data.userId,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            db.portfolios.push(newItem);
            await writeDb(db);
            return this.enrich(newItem);
        }
        return null;
    },

    async findOneAndDelete({ id }) {
        const db = await readDb();
        const index = db.portfolios.findIndex(p => p.id === id);
        if (index !== -1) {
            const deleted = db.portfolios.splice(index, 1)[0];
            await writeDb(db);
            return deleted;
        }
        return null;
    },

    enrich(p) {
        if (!p) return null;
        return {
            ...p,
            save: async function () {
                const db = await readDb();
                const idx = db.portfolios.findIndex(item => item.id === this.id);
                if (idx !== -1) {
                    db.portfolios[idx] = { ...this, updatedAt: new Date().toISOString() };
                    // Remove the save function itself before saving to JSON
                    delete db.portfolios[idx].save;
                    delete db.portfolios[idx].toJSON;
                    await writeDb(db);
                }
            },
            toJSON: function () {
                const ret = { ...this };
                delete ret.save;
                delete ret.toJSON;
                return ret;
            }
        };
    }
};

export default Portfolio;
