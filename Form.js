// form.js

class Form {
    static isNullOrWhitespace(value) {
        return value == null || (typeof value === 'string' && !value.trim().length);
    }

    static normalize(questions) {
        if(questions != null){
            if(typeof questions === 'object' && !Array.isArray(questions)){
                return {...questions};
            } else if(typeof questions === 'string'){
                return {[questions]: null};
            } else if(Array.isArray(questions)){
                const table = {};
                for(const key of questions){
                    table[key] = null;
                }
                return table;
            } else {
                throw new Error('Invalid type for questions. Expected object, string, or array.');
            }
        } else {
            throw new Error('Questions parameter is required.');
        }
    }

    static set(obj, keys, value) {
        let current = obj;
        for(let i = 0; i < keys.length - 1; i++){
            const key = keys[i];
            if(!(key in current) || typeof current[key] !== 'object' || current[key] === null){
                current[key] = {};
            }
            current = current[key];
        }
        current[keys[keys.length - 1]] = value;
    }

    static get(obj, keys) {
        let current = obj;
        for(const key of keys){
            if(current && typeof current === 'object' && key in current){
                current = current[key];
            } else {
                return undefined;
            }
        }
        return current;
    }

    static apply(target, values){
        const recursiveApply = (obj, currentPath = []) => {
            for(const key in obj){
                const value = obj[key];
                const newPath = currentPath.concat(key);
                if(value !== null && typeof value === 'object' && !Array.isArray(value)){
                    recursiveApply(value, newPath);
                } else {
                    Form.set(target, newPath, value);
                }
            }
        };
        recursiveApply(values);
    }

    static forEachLeaf(obj, chain = [], callback){
        if(obj !== null && typeof obj === 'object' && !Array.isArray(obj)){
            for(const key in obj){
                const value = obj[key];
                if(value !== null && typeof value === 'object'){
                    Form.forEachLeaf(value, chain.concat(key), callback);
                } else {
                    callback(chain.concat(key), value);
                }
            }
        } else {
            callback(chain, obj);
        }
    }

    constructor(questions,defaults){
        return class {
            static defaults = Form.normalize(defaults);
            static questions = Form.normalize(questions);

            constructor(options = {}){
                Form.apply(this, this.constructor.questions);
                Form.apply(this, options);
            }

            async ask(){
                Form.forEachLeaf(this, [], async (keys, value) => {
                    if(value === null){
                        let def = Form.get(this.constructor.defaults, keys);
                        if(typeof def === 'function'){
                            def = def(this);
                        }
                        let question = keys.join('.');
                        question = Form.isNullOrWhitespace(def) ? question : `${question} (default:${def})`;
                        const answer = await Form.prompt(`${question}: `);

                        if(!Form.isNullOrWhitespace(answer)){
                            Form.set(this, keys, answer);
                        } else {
                            Form.set(this, keys, def);
                        }
                    }
                });
            }

            #path = null;

            async save(path = this.#path){
                this.#path = path;
                await Form.save(path, this);
            }
        }
    }

    static save = async (path, data) => console.log(JSON.stringify(data, null, 2));
    static prompt = (()=>{
        if(globalThis.prompt){
            return async (question) => {
                return prompt(question);
            }
        } else {
            return async (question) => {
                const readline = require('readline').createInterface({
                    input: process.stdin,
                    output: process.stdout
                });
                return new Promise(resolve => {
                    readline.question(question, answer => {
                        readline.close();
                        resolve(answer);
                    });
                });
            }
        }
    })()
}