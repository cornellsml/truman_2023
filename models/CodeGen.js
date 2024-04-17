const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const engineerSchema = new Schema({
    code: String,
    location: String
});

const projectManagerSchema = new Schema({
    plan: [[String]],
    files: [String]
});

const codeGenSchema = new Schema({
    user: { type: Schema.ObjectId, ref: 'User' },
    id: { type: String, unique: true }, // ID of chat user gives or "none" if not given
    agentResponses: [new Schema({
        rounds: Number,
        investment: Number,
        status: String,
        human: String,
        engineer: [engineerSchema],
        projectManager: [projectManagerSchema]
    })]
}, { timestamps: true });

const CodeGen = mongoose.model('agent-logs', codeGenSchema);
module.exports = CodeGen;