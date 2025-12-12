import Vote from "../models/vote.model.js";

// --- Helper function for displaying results ---
const formatVoteResults = (vote) => {
    // Calculate total votes across all choices
    const totalVotes = vote.choices.reduce((sum, choice) => sum + choice.votes, 0);

    // Map choices to include percentage for easy client display
    const choicesWithPercentages = vote.choices.map(choice => ({
        id: choice._id,
        text: choice.text,
        votes: choice.votes,
        // Ensure you don't divide by zero
        percentage: totalVotes > 0 ? parseFloat(((choice.votes / totalVotes) * 100).toFixed(2)) : 0,
    }));

    return {
        _id: vote._id,
        question: vote.question,
        choices: choicesWithPercentages,
        totalVotes: totalVotes,
    };
};

// --- Controllers ---

/**
 * @route POST /api/votes/:voteId/cast
 * @description Cast a vote for a specific choice in an existing poll
 * @access Private (Requires Auth)
 */
export const castVote = async (req, res) => {
    try {
        const {
            voteId
        } = req.params;
        // choiceId is the _id of the choice within the choices array
        const {
            choiceId
        } = req.body; 
        const userId = req.userId; // User ID from your authentication middleware

        if (!choiceId) {
            return res.status(400).json({
                message: "A choice ID is required to cast a vote."
            });
        }
        
        // Find the poll by its ID
        const vote = await Vote.findById(voteId);

        if (!vote) {
            return res.status(404).json({
                message: "Vote poll not found."
            });
        }

        // 1. **Check for Duplicate Vote (Crucial for Voting Apps)**
        // Convert userId to string for safe comparison with the array of ObjectIds
        const hasVoted = vote.votedBy.some(voterId => voterId.toString() === userId.toString());
        if (hasVoted) {
            return res.status(400).json({
                message: "You have already voted in this poll."
            });
        }

        // 2. **Find the Selected Choice**
        const choice = vote.choices.find(c => c._id.toString() === choiceId);
        if (!choice) {
            return res.status(400).json({
                message: "Invalid choice ID for this poll."
            });
        }

        // 3. **Update Database Atomically**
        // A better approach than vote.save() is using findOneAndUpdate for atomicity:
        const updatedVote = await Vote.findOneAndUpdate(
            {
                _id: voteId,
                "choices._id": choiceId, // Match the choice by its ID
            },
            {
                $inc: { "choices.$.votes": 1 }, // Increment the matched choice's votes
                $push: { votedBy: userId },     // Add the user to the votedBy list
            },
            {
                new: true, // Return the updated document
            }
        );

        if (!updatedVote) {
             return res.status(500).json({ message: "Failed to update vote or choice not found." });
        }
        
        // Return the results after the successful vote
        res.json({
            message: "Vote cast successfully",
            results: formatVoteResults(updatedVote)
        });
    } catch (error) {
        console.error("Error casting vote:", error.message);
        // Handle JWT verification errors if they bubble up, or database errors
        res.status(500).json({
            message: "Server error",
            error: error.message
        });
    }
};


/**
 * @route GET /api/votes/:voteId/results
 * @description Get the results (question, choices, votes, percentages) of a single poll
 * @access Public
 */
export const getVoteResults = async (req, res) => {
    try {
        const {
            voteId
        } = req.params;

        const vote = await Vote.findById(voteId);

        if (!vote) {
            return res.status(404).json({
                message: "Vote poll not found."
            });
        }

        // Send the formatted results
        res.json(formatVoteResults(vote));
    } catch (error) {
        console.error("Error getting vote results:", error.message);
        res.status(500).json({
            message: "Server error",
            error: error.message
        });
    }
};

export const createVote = async (req, res) => {
    try {
        const {
            question,
            choices
        } = req.body;
        // Assuming your auth middleware puts the creator's ID here
        const createdBy = req.userId; 

        // Basic validation
        if (!question || !choices || !Array.isArray(choices) || choices.length < 2) {
            return res.status(400).json({
                message: "Please provide a question and at least two choices."
            });
        }

        // Map the choices array (strings) into the sub-document format
        const voteChoices = choices.map(choiceText => ({
            text: choiceText,
            votes: 0 // Initialize votes to 0
        }));

        const newVote = await Vote.create({
            question,
            choices: voteChoices,
            createdBy,
            votedBy: [] // Initialize the list of voters as empty
        });

        res.status(201).json(newVote);
    } catch (error) {
        console.error("Error creating vote:", error.message);
        // Handle unique constraint violation (if question is unique)
        if (error.code === 11000) {
            return res.status(400).json({ message: "A poll with this question already exists." });
        }
        res.status(500).json({
            message: "Server error",
            error: error.message
        });
    }
};