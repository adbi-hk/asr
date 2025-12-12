import {redis} from "../lib/redis.js"
import User from "../models/user.model.js"
import jwt from "jsonwebtoken"

const generateToken = (userId) => {
     const accessToken = jwt.sign({userId} , process.env.ACCESS_TOKEN_SECRET , {
        expiresIn: "15m"})

     const refreshToken = jwt.sign({userId} , process.env.REFRESH_TOKEN_SECRET , {
        expiresIn: "7d"})
     return {accessToken , refreshToken}   
}

const storeRefreshToken = async (userId , refreshToken) => {
    await redis.set(`refresh_token:${userId}`,refreshToken,"EX",7*24*60*60)
}

const setCookies = (res , accessToken , refreshToken) => {
    res.cookie("accessToken" , accessToken , {
        httpOnly : true , // prevent XSS attacks
        secure : process.env.NODE_ENV === 'production' ,
        sameSite: "strict", // prevent CSRF attacks
        maxAge: 15*60*1000 , // it's in ms
    })

    res.cookie("refreshToken" , refreshToken , {
        httpOnly : true , // prevent XSS attacks
        secure : process.env.NODE_ENV === 'production' ,
        sameSite: "strict", // prevent CSRF attacks
        maxAge: 7*24*60*60*1000 , // it's in ms
    })
}


export const singup = async (req,res) => {
    const{ name , last_name , email ,password} = req.body
    try {
        const userExists = await User.findOne({email});
    if(userExists){
        return res.status(400).json({message : "user already exist !! "})
    }
    const user = await User.create({email , name , last_name , password})
    // authenticate user 
    const {accessToken , refreshToken}=generateToken(user._id)
    await storeRefreshToken(user._id , refreshToken)
    setCookies(res,accessToken,refreshToken);
    res.status(201).json({
        _id : user._id ,
        name : user.name ,
        last_name : user.last_name ,
        email : user.email ,
        role : user.role,
    })
    }
     catch (error) {
        console.log("error in signup controller" , error.message )
        res.status(500).json({message : error.message})
    }
}
export const login = async (req,res) => {
    try {
        const {email , password} = req.body ;
        const user = await User.findOne({email})
        if(user && (await user.comparePassword(password))){
            const {accessToken , refreshToken} = generateToken(user._id);

            await storeRefreshToken(user._id , refreshToken);
            setCookies(res,accessToken,refreshToken);
            
            res.json({
                _id : user._id ,
                name : user.name ,
                last_name : user.last_name ,
                email : user.email ,
                role : user.role,})
        }else{
            res.status(401).json({message : "invalid email or password"})
        }
    } catch (error) {
        console.log("error in loggin controller" , error.message )
    }
}

export const logout = async (req,res) => {
    try {
        const refreshToken =req.cookies.refreshToken;
        if (refreshToken){
            const decoded = jwt.verify(refreshToken , process.env.REFRESH_TOKEN_SECRET);
            await redis.del(`refresh_token:${decoded.userId}`)
        } 
        res.clearCookie("accessToken");
        res.clearCookie("refreshToken");
        res.json({message : "logged out successfully"})
    } catch (error) {
        console.log("error in loggout controller" , error.message )
        res.status(500).json({message : "server error " , error : error.message})
    }
}
// this will recreate access token when it expire 
export const refreshToken = async (req,res) => {
    try {
        const {refreshToken} = req.cookies.refreshToken ;
        if(!refreshToken){
            return res.status(401).json({ message :"No refresh token provided"});
        }
        const decoded = jwt.verify(refreshToken , process.env.REFRESH_TOKEN_SECRET);
        const storedToken = await redis.get(`refrech_token:${decoded.userId}`);
        if(storedToken !== decoded){
            return res.status(401).json({message : "Invalid refresh token"})
        }
        const accessToken = jwt.sign({userId: decoded.userId}, process.env.ACCESS_TOKEN_SECRET , {expiresIn : "15m"})
        res.cookie("accessToken" , accessToken , {
        httpOnly : true , // prevent XSS attacks
        secure : process.env.NODE_ENV === 'production' ,
        sameSite: "strict", // prevent CSRF attacks
        maxAge: 15*60*1000 , // it's in ms
    })
    res.json({message : "token refreshed successfully"})
    } catch (error) {
        console.log("Error in refresh Token controller" , error.message)
        res.status(500).json({message: "server error" , error: error.message})
    }
}