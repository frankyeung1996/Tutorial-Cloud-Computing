const admin = require('firebase-admin');
const functions = require('firebase-functions');

admin.initializeApp(functions.config().firebase);
let db = admin.firestore();

//3 Table in the Firebase
//users, messages, commons

//3 function:
//- login (username, password) => status
//- Register (username, password) => status
//- Search (username, keyword) => add message to chatbot => search Common Table => add message to chatbot
//- ViewChatBox (username) => all messages in the chatbox order by the created_datetime desc

exports.register = functions.https.onRequest(async (req, res) => {
  //input: username, password
  let FieldValue = require('firebase-admin').firestore.FieldValue;
  const username = req.query.username;
  const password = req.query.password;

  //process: check if user exists in the firebase or not
  //if yes, then error
  //if no, continue to register
  let query = db.collection('users').where('username', '==', username).get()
    .then(snapshot => {
      if (snapshot.empty) {
        //output: if no user is created previously,
        //create a record in the firebase, return a success message
        let docRef = db.collection('users').doc(username);
        let setAda = docRef.set({
          username: username,
          password: password,
          created_datetime: FieldValue.serverTimestamp()
        });
        res.json({
          status: 1,
          message: "Register successfully!"
        });
      } else if  (username == 'commons' || username == 'users') {
        res.json({
          status: 0,
          message: "Error occur!"
        });
      } else {
        res.json({
          status: 0,
          message: "User already exist!"
        });
      }
    }).catch(err => {
      res.json({
        status: 0,
        message: "Error occur!"
      });
    });
});

exports.login = functions.https.onRequest(async (req, res) => {
  //input: username, password
  let FieldValue = require('firebase-admin').firestore.FieldValue;
  const username = req.query.username;
  const password = req.query.password;

  //process: check if username and password exists in the firebase or not
  //if yes, then allow login
  //if no, error
  let query = db.collection('users').where('username', '==', username).where('password', '==', password).get()
    .then(snapshot => {
      if (snapshot.empty) {
        res.json({
          status: 0,
          message: "Username or password are wrong!"
        });
      } else {
        res.json({
          status: 1,
          message: "Login Success!",
          data: snapshot.val()
        });
      }
    }).catch(err => {
      res.json({
        status: 0,
        message: "Error occur!"
      });
    });

});

exports.search = functions.https.onRequest(async (req, res) => {
  //input: username, keyword
  let FieldValue = require('firebase-admin').firestore.FieldValue;
  const username = req.query.username;
  const keyword = req.query.keyword;

  //process 1: add the user request into the User's Chat Box

  let docRef = db.collection(username).doc();
  let setAda = docRef.set({
    message: keyword,
    isSenderFromUser: 1,
    created_datetime: FieldValue.serverTimestamp()
  });

  //process 2: check if the user request is found in the common database,
  //if yes, then return the result directly
  //else, then return no related result
  let query = db.collection('commons').where('keyword', '==', keyword).get()
    .then(snapshot => {
      if (snapshot.empty) {

        //output: add the message with "related result" into the User's Chat Box
        //if no related result, then will add the message with "no result" to the User's Chat Box

        let docRef = db.collection(username).doc();
        let setAda = docRef.set({
          message: "No related result",
          isSenderFromUser: 0,
          created_datetime: FieldValue.serverTimestamp()
        }).then(() => {
          res.json({
            status: 1,
            message: "No related result"
          });
        });

      } else {
        let docRef = db.collection(username).doc();

        let setAda = docRef.set({
          message: snapshot.val().message,
          isSenderFromUser: 0,
          created_datetime: FieldValue.serverTimestamp()
        }).then(() => {
          res.json({
            status: 1,
            message: "Found result: " + snapshot.val().message
          });
        });
      }
    }).catch(err => {
      let docRef = db.collection(username).doc();

      let setAda = docRef.set({
        message: "No related result",
        isSenderFromUser: 0,
        created_datetime: FieldValue.serverTimestamp()
      }).then(() => {
        res.json(JSON.stringify({
          status: 0,
          messsage: "No related result!"
        }));
      });
    });

});


exports.view_chat_box = functions.https.onRequest(async (req, res) => {
  //input: username
  let FieldValue = require('firebase-admin').firestore.FieldValue;
  const username = req.query.username;

  let return_array = [];

  //process 1: get the reference of the User's ChatBot
  let userRef = db.collection(username);
  let getDoc = userRef.orderBy('created_datetime', 'desc').get()
    .then(snapshot => {
      snapshot.forEach(doc => {
        console.log(doc.id, '=>', doc.data());
        return_array.push(doc.data());
      });
      res.json({
        status: 1,
        data: JSON.stringify(return_array)
      });
    }).catch(err => {
      console.log('Error getting documents', err);
    });

});
