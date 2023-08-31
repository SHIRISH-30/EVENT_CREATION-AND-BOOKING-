//express
const express = require("express");
const app = express();

const mongoose=require('mongoose')
//for post req
app.use(express.urlencoded({extended:true}));

//method oveeride for put delete req
const methodOverride=require("method-override");
app.use(methodOverride("_method"));
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));

const catchAsync=require("./utils/CatchAsync")
const ExpressError=require("./utils/ExpressError")
//path for veiws and dotenv
const path = require('path');
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
const dotenv=require('dotenv');
dotenv.config();

const User=require("./models/User")
//express session and passport
const session=require('express-session');
const passport=require("passport")
const GoogleStragery=require("passport-google-oauth20").Strategy;
//FLASH
const flash=require("connect-flash");
app.use(flash());

app.use(express.static(path.join(__dirname,"public")));

app.use(session({
    secret:"key",
    resave:false,
    saveUninitialized:true,
    cookie:{secure:false},
}))

app.use(passport.initialize());
app.use(passport.session());

passport.use(new GoogleStragery({clientID:"958261893656-u3o2d39orvcucj7fqsdt584q6kt8m0pt.apps.googleusercontent.com",
clientSecret:"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",
callbackURL:"http://localhost:4003/auth/google/callback"},async function(acessToken,refreshToken,profile,done){
     //user model me yeh sab daalenge
     const newuser={
      googleId:profile.id,
      displayName:profile.displayName,
      firstName:profile.name.givenName,
      lastName:profile.name.familyName,
      profileImage:profile.photos[0].value,
   }
   try {
     
      //checking for user for existence
      let user=await User.findOne({googleId:profile.id});
      if(user)  //if user is present then ohk
      {
       
        done(null,user);
      }
      else{  //if not present then create 
          user=await User.create(newuser);
          done(null,user);
      }


   } catch (error) {
      console.log(error);
   }
}));

//Stripe api
const Publishable_Key="pk_test_51NkUQgSDWmLXZZwiepNfIyBusYpTD6ilmn3Runtqwc7KS3YGDxtYtXCuIXEWIzsMl9IvscZUSGP1ED1UkyluWSOv00NeROTsP5";
const Secret_Key="sk_test_51NkUQgSDWmLXZZwiNowpbbX5exLS6gIuIZdapQScxxocrSziQ4W8hEtkCfzLgpSmA7qshnIULDEZCDUAHSkNd7Bj00JSVyq3uJ";
const stripe = require('stripe')(Secret_Key)

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.CONNECTION_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

app.use((req,res,next)=>{
  res.locals.currentUser=req.user;
  res.locals.success=req.flash('success');
  res.locals.error=req.flash('error');
  next();
})
connectDB();

//nodemailer

const nodemailer = require('nodemailer')

// //for styling//
// installed ejs-mate // require it and set it//
const ejsMate=require("ejs-mate");
app.engine("ejs",ejsMate); 

const {isLoggedIn}=require("./middleware");
app.listen(4003,(req,res)=>{
    console.log("server started");
})

app.get("/home",(req,res)=>{
 
  

    if(req.user)
    {
      req.flash("success","WELCOME")
    }
    res.render("home",{user:req.user,key: Publishable_Key});
  
   
    
})


app.get('/login',(req,res)=>{
  res.render("login");
})
app.get('/auth/google',
  passport.authenticate('google', { scope: ['email','profile'] }));

  app.get('/auth/google/callback', 
  passport.authenticate('google', 
  {
    failureRedirect:"/login",
     successRedirect:'/home' },
  ),
  );
  app.get("/logout", (req, res) => {
   
      // req.session.destroy(error => {
      //   if(error) {
      //     console.log(error);
      //     res.send('Error loggin out');
      //   } else {
      //     res.redirect('/')
      //   }
      // })
    req.logout(function (err) {
      if (err) {
        console.log(err);
      } else {
        req.flash("success","BYE BYE!")
        res.redirect("/home");
      }
    });
  });
  
  //router if something went wrong
  app.get("/login-failure",(req,res)=>{
    res.send("Something Went Wrong :(")
  })

app.get("/chat",(req,res)=>{
  res.render("chat");
})
   // Presist user data after successful authentication
   passport.serializeUser(function (user, done) {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });

  //Stripe Api

  app.get("/price",isLoggedIn,(req,res)=>{
    res.render("price", {
      key: Publishable_Key
      });
  })
  app.post('/payment',async function(req, res) {
    try {
      // Create a customer in Stripe
      const customer = await stripe.customers.create({
        email: req.body.stripeEmail,
        source: req.body.stripeToken,
        name: 'Customer',
        address: {
          line1: 'TC 9/4 Old MES colony',
          postal_code: '110092',
          city: 'New Delhi',
          state: 'Delhi',
          country: 'India'
        }
      });
  
      // Add a payment source to the customer (a credit card in this case)
      // await stripe.customers.createSource(customer.id, {
      //   source: req.body.stripeToken
      // });
  
      // Charge the customer using the payment source
      const charge = await stripe.paymentIntents.create({
        amount: 50000, // Charging Rs 25
        description: 'Donation',
        currency: 'INR',
        customer: customer.id
      });
  
      // Redirect to a success page
      res.sendFile(path.join(__dirname + '/thanks.html'));
    } catch (err) {
      // Handle errors
      res.send(err);
    }
  });
  //nodemailer
  app.get("/contact",(req,res)=>{
    res.render("contact");
  })

  app.get('/send', (req, res) => {
    // fetching data from form

    let email1 = req.query.email1;
    let subject = req.query.subject;
    let message = req.query.message;


    const mail = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
            user: "shiroshetty30@gmail.com",
            pass: "ibaymoahwvqddpty"
        }

    });

    mail.sendMail({
        from: 'shiroshetty30@gmail.com',
        to: [email1],
        subject: subject,
        html: '<h1 >' + message + '</h1>'

    }, (err) => {
        if (err) throw err;
        req.flash("success","mail has been sent");
        res.render('home');

    });
});
//error middleware

app.use((err,req,res,next)=>{
  const {status=500}=err;
      if(!err.message) err.message="Oh no Something Went Wrong!!";
      res.status(status).render("error",{err});
  })
  