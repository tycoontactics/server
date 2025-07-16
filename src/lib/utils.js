import jwt from "jsonwebtoken";
import Game from "../models/game.model.js";


export const generateToken = (userId, res) => {
    const token = jwt.sign({userId}, process.env.JWT_SECRET, {
        expiresIn: "7d",
    });
    res.cookie("jwt", token, {
        maxAge: 7*24*60*60*1000,
        httpOnly: true,
        sameSite: "None",
        secure: process.env.NODE_ENV !== "development",
    });
    return token;
}

const generateNamespace =  (length = 6) => {
    let result           = '';
    const characters       = 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789';
    const charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
       result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
 };

export const generateUniqueCode = async () => {
    let code;
    let exists = true;

    while(exists) {
        code = generateNamespace();
        exists = await Game.exists({code});
    }
    return code;
}

export const deleteInactiveGames = async () => {
    const INACTIVITY_LIMIT = 30*60*1000;
    const expiryTime = new Date(Date.now() - INACTIVITY_LIMIT);
    try {
        const result = await Game.deleteMany({updatedAt: {$lt: expiryTime}});
        if (result.acknowledged && result.deletedCount > 0)
            console.log(`Deleted ${result.deletedCount} inactive games`);
        else
            console.log(`No inactive game to delete`);
            
    } catch (error) {
        console.log("Error deleting inactive games", error);
    }
}