import mongoose from "mongoose";

const spaceSchema = new mongoose.Schema({
    id: { type: Number, required: true }, // Space ID (0-39)
    name: { type: String, required: true },
    color: {type: String },
    price: {type: Number },
    base: {type: Number },
    hCost: {type: Number },
    setSize: { type: Number },
    setPairIndices: [{type: Number}],
    
    go: { type: Boolean, default: false },
    property: { type: Boolean, default: false },
    station: { type: Boolean, default: false },
    utility: { type: Boolean, default: false },
    tax: { type: Boolean, default: false },
    jail: { type: Boolean, default: false },
    free: { type: Boolean, default: false },

    chance : { type: Boolean, default: false },
    comm : { type: Boolean, default: false },
    owned: { type: Boolean, default: false },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }, // Property owner
    houses: { type: Number, default: 0 },
    hotels: { type: Number, default: 0 },

    gridRow: {type: String},
    gridColumn: {type: String},
    mortgaged: {type: Boolean},
});
const gameSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
    },
    hostId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    players: [
        {
            userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
            position: { type: Number, default: 0 }, // Player's position on the board (0-39)
            money: { type: Number, default: 15000 }, // Starting money
            properties: [{ type: Number }], // Stores property IDs owned
            inJail: { type: Boolean, default: false },
            jailTurns: { type: Number, default: 0 },
        },
    ],
    boardState: [spaceSchema],
    currentTurn: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    turnOrder: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // Order of players
    started: { type: Boolean, default: false },
    winner: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

}, {timestamps: true});

const Game = mongoose.model("Game", gameSchema);
export default Game;
