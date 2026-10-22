const mongoose = require("mongoose");
const { Schema } = mongoose;

// Schema for AI and user messages
const messageSchema = new Schema(
    {
        role: {
            type: String,
            enum: ["ai", "user"],
            required: true
        },

        content: {
            type: String,
            required: true
        }
    },
    {
        timestamps: true
    }
);

// Schema for website projects
const projectSchema = new Schema(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        title: {
            type: String,
            required: true,
            trim: true,
            default: "Untitled Project"
        },

        latestCode: {
            type: String,
            default: ""
        },

        conversation: {
            type: [messageSchema],
            default: []
        },

        deployed: {
            type: Boolean,
            default: false
        },

        deployURL: {
            type: String,
            default: ""
        },

        slug: {
            type: String,
            unique: true,
            sparse: true,
            lowercase: true,
            trim: true
        }
    },
    {
        timestamps: true
    }
);

const Project = mongoose.model("Project", projectSchema);

module.exports = Project;
