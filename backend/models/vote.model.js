import mongoose from "mongoose";

// Sub-schema for the individual choice options
const choiceSchema = new mongoose.Schema({
    // The text of the choice (e.g., "Candidate A", "Option 1")
    text: {
        type: String,
        required: true,
        trim: true,
    },
    // The count of votes for this specific choice
    votes: {
        type: Number,
        default: 0,
    },
});

const voteSchema = new mongoose.Schema({
    // The main question or title of the poll
    question: {
        type: String,
        required: true,
        trim: true,
        unique: true,
    },
    // An array of the available choices
    choices: [choiceSchema],
    // An array to store the IDs of users who have already voted in this poll
    votedBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
    // The user who created the poll
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
}, {
    timestamps: true
});

const Vote = mongoose.model("Vote", voteSchema);

export default Vote;