import mongoose from "mongoose"
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
    name:{
        type:String ,
        required : [true , "Name is require !!"]
    },
    last_name:{
        type:String ,
        required : [true , "last_Name is require !!"]
    },
    email:{
       type:String ,
        required : [true , "email is require !!"],
        unique:true ,
        lowercase:true,
        trim:true
    },
    password:{
        type:String ,
        required : [true , "Password is require !!"],
        minlength : [6 , "password must be at least 6 characters long"],
    },
    role:{
        type:String ,
        enum:["user","admin"],
        default:"user"

    }

},{timestamps : true }

)


// this a pre hook for hashing the password before saving to thr db 
userSchema.pre("save",async function () {
    if(!this.isModified("password")) return ;
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        
    } catch (error) {
        
    }
});

// a method to compare password when login
userSchema.methods.comparePassword = async function (password) {
    return bcrypt.compare(password, this.password);
}
const User = mongoose.model("User",userSchema);

export default User ;