import bcrypt from "bcryptjs";

import User from "../models/user.model.js";
import { generateToken } from "../lib/utils.js";

export const signup = async (req, res) => {
    const {username, email, password} = req.body;
    try {
        const emailCheck = await User.findOne({email});
        const usernameCheck = await User.findOne({username});

        if (emailCheck)
            return res.status(400).json({message: "Email already in use"});
        else if (usernameCheck)
            return res.status(400).json({message: "Username taken"});

        const salt = await bcrypt.genSalt(10);        
        const hashedPass = await bcrypt.hash(password, salt);

        const newUser = new User({
            username,
            email,
            password: hashedPass,
        });

        if (newUser){
            generateToken(newUser._id, res);

            await newUser.save();
            res.status(201).json({
                _id: newUser._id, 
                username: newUser.username,
                email: newUser.email,
                profilePic: newUser.profilePic,
            });
        } else {
            res.status(400).json({message: "Invalid user data"});
            console.log("Invalid user data");
        }

    } catch (error) {
        console.log("Error in signup controller", error.message);
        res.status(500).json({message: "Internal server error"});
    }
};

export const login = async (req, res) => {
    const {email, password} = req.body;
    try {
        const user = await User.findOne({email});

        if(!user)
            return res.status(400).json({message: "Invalid Credentials"});

        const isPass = await bcrypt.compare(password, user.password);
        
        if(!isPass)
            return res.status(400).json({message: "Invalid Credentials"});

        generateToken(user._id, res);

        res.status(200).json({
            _id: user._id,
            username: user.username,
            email: user.email,
            profilePic: user.profilePic,
        });

    } catch (error) {
        console.log("Error in login controller", error.message);
        res.status(500).json({message: "Internal Server Error"});
    }
};

export const logout = (req, res) => {
    try {
        res.cookie("jwt", "", {maxAge: 0});
        res.status(200).json({message: "Logged Out Successfully"});
    } catch (error) {
        console.log("Error in logout controller",);
        res.status(500).json({message: "Internal Server Error"});
    }
};

export const checkAuth = (req, res) => {
    try {
        res.status(200).json(req.user);
    } catch (error) {
        console.log("Error check auth controller", error.message);
        res.status(500).json({message: "Internal Server Error"});       
    }
}