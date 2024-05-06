const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const engineerSchema = new Schema({
    Code: String,
    FileName: String,
    Before: String, 
    After: String
    
});

const projectManagerSchema = new Schema({
    Clarifications: [String],
    Specification: [String],
    Requirement: String,
    Change_type: [String]
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