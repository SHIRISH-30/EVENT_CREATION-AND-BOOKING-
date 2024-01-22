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

const Event=require("./models/Event")
const User=require("./models/User")
//express session and passport
const session=require('express-session');
const passport=require("passport")
const GoogleStragery=require("passport-google-oauth20").Strategy;

const twilio = require('twilio');

// Twilio credentials
const accountSid = 'AC42b8aed93d4482bf9542ebeabc31a36e';
const authToken = '86eab7ba1b4339bd402ca030ec34487d';
const twilioPhoneNumber = '+14155238886';

const client = twilio(accountSid, authToken);
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
//file upload
// const fileUpload = require('express-fileupload');
// app.use(fileUpload());


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

const multer = require('multer');
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/uploads/'); // Uploads will be stored in the 'uploads' directory
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

app.listen(4003,(req,res)=>{
    console.log(`server started http://localhost:4003/home`);
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
            pass: ""
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

app.get("/discover",isLoggedIn,async(req,res)=>{
  const eventData=await Event.find({});
  res.render("discover_event.ejs",{eventData});
})

app.get("/create-event",async(req,res)=>{
  res.render('create_event_form',{user:req.user});
})

//create Event 
app.post('/create-event', upload.single('eventImage'), async (req, res) => {
  try {
    const eventData = req.body;

    // Create an Event document
    const event = new Event({
      eventName: eventData.eventName,
      eventDate: eventData.eventDate,
      created:eventData.eventOwner,
      eventTime: eventData.eventTime,
      eventImage:req.file.filename,
      eventLocation: eventData.eventLocation,
      eventDescription: eventData.eventDescription,
      totalTickets: eventData.totalTickets,
      ticketCategories: eventData.categoryName.map((name, index) => ({
        categoryName: name,
        categoryTickets: eventData.categoryTickets[index],
      })),
    });

    // Save the document to the database
    const savedEvent = await event.save();

    res.status(201).redirect("/discover");
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/discover/:id',async(req,res)=>{
  const eventData=await Event.findById(req.params.id).populate('bookedTickets.user');
  const owner=eventData.created
  
  res.render('event_single',{eventData,owner});
})
app.get('/edit-event/:id',async(req,res)=>{
  const eventData=await Event.findById(req.params.id)
  res.render("edit.ejs",{eventData});
})
app.post('/update-event/:id', upload.single('eventImage'), async (req, res) => {
  try {
    const eventId = req.params.id;
    const eventData = req.body;

    // Find the existing event in the database
    const existingEvent = await Event.findById(eventId);

    if (!existingEvent) {
      req.flash('error', 'Event not found');
      return res.redirect(`/edit-event/${eventId}`);
    }

    // Update the existing event data
    existingEvent.eventName = eventData.eventName;
    existingEvent.eventDate = eventData.eventDate;
    existingEvent.eventOwner = eventData.eventOwner;
    existingEvent.totalTickets = eventData.totalTickets;

    // Update other fields as needed

    // Save the updated event data
    const updatedEvent = await existingEvent.save();

    req.flash('success', 'Event updated successfully');
    res.redirect(`/discover/${eventId}`);
  } catch (error) {
    console.error(error);
    req.flash('error', 'Error updating event');
    res.redirect(`/edit-event/${req.params.id}`);
  }
});

// Add this route to your Express app
app.post('/delete-event/:id', async (req, res) => {
  try {
    const eventId = req.params.id;
    
    // Use Mongoose to find and remove the event by its ID
    const deletedEvent = await Event.findByIdAndRemove(eventId);

    if (!deletedEvent) {
      // If the event with the given ID is not found
      return res.status(404).json({ message: 'Event not found' });
    }

    // Optionally, you can redirect or respond with a success message
    res.redirect('/home'); // Redirect to the homepage or another appropriate route
    // Alternatively, you can send a JSON response
    // res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    // Handle errors, e.g., log the error and send an error response
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});


app.get('/book-ticket/:eventId', isLoggedIn, async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
    res.render('book-ticket', { event ,
      key: Publishable_Key
      });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


// Handle booking form submission
app.post('/book-ticket/:eventId', isLoggedIn, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { numTickets, categoryName, phoneNumber } = req.body;

    // Validate input
    if (!numTickets || isNaN(numTickets) || numTickets <= 0 || !categoryName || !phoneNumber) {
      req.flash('error', 'Invalid input');
      return res.redirect(`/book-ticket/${eventId}`);
    }

    // Retrieve the event
    const event = await Event.findById(eventId);

    // Check ticket availability
    if (event.totalTickets < numTickets) {
      req.flash('error', 'Not enough tickets available');
      return res.redirect(`/book-ticket/${eventId}`);
    }

    // Check if the selected category exists in the event's categories
    const selectedCategory = event.ticketCategories.find(category => category.categoryName === categoryName);

    if (!selectedCategory) {
      req.flash('error', 'Invalid category selected');
      return res.redirect(`/book-ticket/${eventId}`);
    }

    // Process the booking
    const booking = {
      user: req.user._id,
      numTickets: parseInt(numTickets, 10),
      categoryName: selectedCategory.categoryName,
      phoneNumber: phoneNumber,
    };

    // Update the event's bookedTickets array
    event.bookedTickets.push(booking);
    event.totalTickets -= booking.numTickets;

    // Save the changes to the database
    await event.save();

    // Send WhatsApp message using the information from the newly created booking
    const bookedTicket = event.bookedTickets[event.bookedTickets.length - 1];
    const userPhoneNumber = bookedTicket.phoneNumber;
    const message = `Thank you for booking ${bookedTicket.numTickets} tickets for ${event.eventName} on ${event.eventDate} at ${event.eventLocation}.`;

    // Log the message and send WhatsApp message
    console.log(message);
    client.messages
      .create({
        from: 'whatsapp:+14155238886',
        to: `whatsapp:+91${userPhoneNumber}`,
        body: message,
      })
      .then((message) => console.log(`WhatsApp message sent: ${message.sid}`))
      .catch((error) => console.error(`Error sending WhatsApp message: ${error.message}`));

    req.flash('success', 'Tickets booked successfully');
    res.redirect(`/discover/${eventId}`);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

//error middleware

app.use((err,req,res,next)=>{
  const {status=500}=err;
      if(!err.message) err.message="Oh no Something Went Wrong!!";
      res.status(status).render("error",{err});
  })
  


  