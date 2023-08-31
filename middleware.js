const User=require("./models/User");
module.exports.isLoggedIn=(req,res,next)=>{
    //isAuthenicated checks whether the user is signed in or not
   
       if(!req.isAuthenticated())
    {
       //agar user signed in nahi hai and he login in wo usse index me chodega
       //to overcame ham uska originalUrl session me store karenge
       //orginalUrl contains full path
       req.session.returnTo = req.originalUrl;
       req.flash("error","You must be signed in");
       return  res.redirect("/home");
    }
    //yeh nhi toh niche ka excute
   next();
   }