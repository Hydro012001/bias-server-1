const express = require("express");
const mysql = require("mysql");
const cors = require("cors");
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const MySQLEvents = require("@rodrigogs/mysql-events");
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "https://bias-server-1.onrender.com/",
    methods: ["GET", "POST"],
  },
});
const bcrypt = require("bcrypt");
const salt = 10;
app.use(cors());
app.use(express.json());

app.listen(3006, () => {
  console.log("running");
});

const db = mysql.createConnection({
  host: "sql12.freesqldatabase.com	",
  user: "sql12650583",
  password: "MIwKKAUnT7",
  database: "sql12650583",
});

app.get("/", (req, res) => {
  return res.json("Server is online");
});

app.get("/admin/listofuser", (req, res) => {
  db.query("select * from usertbl", (error, result) => {
    if (error) {
      return res.send({ status: false, message: error.message });
    } else {
      return res.send({ status: true, result });
    }
  });
});

app.get("/admin/listofBusinessApproval", (req, res) => {
  const status = "Pending";
  const userType = "entrepreneur";
  db.query(
    "select * from usertbl inner join business on usertbl.user_id = business.buss_user_id where buss_status = ? and usertbl.user_type = ?",
    [status, userType],
    (error, result) => {
      if (error) {
        return res.send({ status: false, message: error.message });
      } else {
        return res.send({ status: true, result });
      }
    }
  );
});

app.post("/admin/approveBusiness", (req, res) => {
  const businessId = req.body.businessId;

  db.query(
    "select * from business left join bussinescredintails on business.buss_id = bussinescredintails.buss_cred_buss_id where business.buss_id = ?",
    businessId,
    (error, result) => {
      if (error) {
        return res.send({ status: false, message: error.message });
      } else {
        return res.send({ status: true, result });
      }
    }
  );
});

app.get("/admin/userApproval", (req, res) => {
  const status = "No Verified";
  db.query(
    "select * from usertbl where user_status = ?",
    status,
    (error, result) => {
      if (error) {
        return res.send({ status: false, message: error.message });
      } else {
        return res.send({ status: true, result });
      }
    }
  );
});
app.post("/admin/approveUser", (req, res) => {
  const id = req.body.user_id;
  db.query(
    "select * from usertbl left join indentificationcard on usertbl.user_id = indentificationcard.idt_user_id where usertbl.user_id = ?",
    id,
    (error, result) => {
      if (error) {
        return res.send({
          status: false,
          message: "Error on fecthing the data",
        });
      } else {
        return res.send({ status: true, result });
      }
    }
  );
});

app.post("/admin/userapprove", (req, res) => {
  const user_id = req.body.user_id;
  const verify = "Verified";
  db.query(
    "update usertbl set user_status = ? where user_id = ?",
    [verify, user_id],
    (error, result) => {
      if (error) {
        return res.send({
          status: false,
          message: "Error In Verifying the use",
        });
      } else {
        return res.send({ status: true, message: "User Sucessfully Verified" });
      }
    }
  );
});

app.post("/admin/approveuserbusiness", (req, res) => {
  const buss_id = req.body.buss_id;
  const verify = "Approved";
  db.query(
    "update business set buss_status = ? where buss_id = ?",
    [verify, buss_id],
    (error, result) => {
      if (error) {
        return res.send({
          status: false,
          message: "Error In approving the business",
        });
      } else {
        return res.send({
          status: true,
          message: "Business Sucessfully Approved",
        });
      }
    }
  );
});

app.get(
  "/admin/listofbusiness",
  (req, res) => {
    const userType = "entrepreneur";

    db.query(
      "select business.*, usertbl.*, sum(investment.invst_amt) as totalAmountInvts from business left join usertbl on usertbl.user_id=  business.buss_user_id left join investment on business.buss_id = investment.invst_buss_id  where usertbl.user_type = ?  GROUP BY business.buss_id, usertbl.user_id",
      [userType],
      (error, result) => {
        if (error) {
          return res.send({
            status: false,
            message: "Error on fecthing the data",
          });
        } else {
          return res.send({ status: true, result: result });
        }
      }
    );
  },
  []
);

server.listen(3005, () => {
  console.log("Server socket running");
});

io.on("connect", (socket) => {
  const sql = "select * from messages";
  db.query(sql, (err, result) => {
    if (err) {
      console.log(err);
    } else {
      io.emit("allMessages", result);
    }
  });

  socket.on("chatRoom", (data) => {
    const chat_id = data;

    const sql =
      "select * from messages where msg_chats_id = ? order by msg_id desc";
    db.query(sql, chat_id, (err, result) => {
      if (err) {
        console.log(err);
      } else {
        socket.to(chat_id).emit("receive", result);
      }
    });
  });

  socket.on("getChatContact", (data) => {
    const userId = data.userId;
    db.query(
      "SELECT CR.*, U1.user_fname AS user1_name, U2.user_fname AS user2_name, M.msg_content AS last_message, M.msg_datetime AS last_message_timestamp FROM chats AS CR INNER JOIN usertbl AS U1 ON CR.cht_user_id_f = U1.user_id INNER JOIN usertbl AS U2 ON CR.cht_user_id_s = U2.user_id INNER JOIN messages AS M ON CR.cht_id = M.msg_chats_id WHERE (U1.user_id = ? OR U2.user_id = ?) AND M.msg_datetime = (SELECT MAX(msg_datetime) FROM messages AS sub WHERE sub.msg_chats_id = CR.cht_id)",
      [userId, userId],
      (error, result) => {
        if (error) {
          console.log(error);
        } else {
          socket.emit("chatcontact", result);
        }
      }
    );
  });

  socket.on("join_chat", (data, callback) => {
    socket.join(data);
    callback(true);
  });

  socket.on("AllChats", (data) => {
    const chat_id = data;
    const sql =
      "select * from messages where msg_chats_id = ? order by msg_id desc";
    db.query(sql, chat_id, (err, result) => {
      if (err) {
        console.log(err);
      } else {
        io.emit("receive", result);
      }
    });
  });
  socket.on("get_chatRoom", (data) => {
    const chat_id = data;
    const sql =
      "select * from messages where msg_chats_id = ? order by msg_id desc";
    db.query(sql, chat_id, (err, result) => {
      if (err) {
        console.log(err);
      } else {
        socket.emit("receive", result);
      }
    });
  });

  socket.on("send", (data) => {
    const message = data.message;
    const chat_id = data.chat_id;
    const senderId = data.senderId;

    const formattedDate = data.formattedDate;

    db.query(
      "insert into messages (msg_content, msg_user_sends, msg_chats_id, msg_datetime) values(?,?,?,?)",
      [message, senderId, chat_id, formattedDate],
      (err, results) => {
        if (err) {
          console.log(err);
        } else {
          const sql =
            "select * from messages where msg_chats_id = ? order by msg_id desc";
          db.query(sql, chat_id, (err, result) => {
            if (err) {
              console.log(err);
            } else {
              db.query(
                "SELECT CR.*, U1.user_fname AS user1_name, U2.user_fname AS user2_name, M.msg_content AS last_message, M.msg_datetime AS last_message_timestamp FROM chats AS CR INNER JOIN usertbl AS U1 ON CR.cht_user_id_f = U1.user_id INNER JOIN usertbl AS U2 ON CR.cht_user_id_s = U2.user_id INNER JOIN messages AS M ON CR.cht_id = M.msg_chats_id WHERE (U1.user_id = ? OR U2.user_id = ?) AND M.msg_datetime = (SELECT MAX(msg_datetime) FROM messages AS sub WHERE sub.msg_chats_id = CR.cht_id)",
                [senderId, senderId],
                (error, res) => {
                  if (error) {
                    console.log(error);
                  } else {
                    console.log(data.chat_id);
                    socket.to(data.chat_id).emit("receive", result);
                    socket.emit("receive", result);
                    // socket.to(data.chat_id).emit("chatcontact", res);
                    socket.to(chat_id).emit("chatcontact", res);
                  }
                }
              );
            }
          });
        }
      }
    );
  });
});
//For Creating Account for the user
//FOr signup
app.post("/createaccount", (req, res) => {
  const password = req.body.password;
  const currentDate = new Date();
  const formattedDate = currentDate
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");
  const usertype = req.body.usertype;
  const firstname = req.body.firstname;
  const lastname = req.body.lastname;
  const middlename = req.body.middlename;
  const Birthday = req.body.Birthday;
  const gender = req.body.gender;
  const phonenum = req.body.phonenum;
  const email = req.body.email;
  const hash = bcrypt.hashSync(password, salt);
  const province = req.body.province;
  const city = req.body.city;
  const barangay = req.body.barangay;

  db.query(
    "insert into usertbl (user_type, user_fname, user_lname, user_mname, user_bdate, user_gender, user_contact_num, user_email, user_password, user_province, user_city, user_barangay, user_created_at) values(?,?,?,?,?,?,?,?,?,?,?,?,?)",
    [
      usertype,
      firstname,
      lastname,
      middlename,
      Birthday,
      gender,
      phonenum,
      email,
      hash,
      province,
      city,
      barangay,
      formattedDate,
    ],
    (error, result) => {
      if (error) {
        res.status(500).send("Error creating account. Please try again later.");
      } else {
        res.send(result);
      }
    }
  );
});

//FOr login
app.post("/login", (req, res) => {
  const email = req.body.email;
  const pass = req.body.password;

  db.query(
    "select * from usertbl where user_email = ?",
    email,
    (error, result) => {
      if (error) {
        return res.send(error);
      }

      if (result.length > 0) {
        bcrypt.compare(pass, result[0].user_password, (err, response) => {
          if (response) {
            return res.send({ success: true, result });
          } else {
            return res.send({ success: false, message: "Wrong password" });
          }
        });
      } else {
        return res.send({ success: false, message: "Wrong username" });
      }
    }
  );
});

app.post("/checkUserStatus", (req, res) => {
  const user_id = req.body.user_id;
  const status = "Verified";
  db.query(
    "select * from usertbl where user_id = ? and user_status =?",
    [user_id, status],
    (error, result) => {
      if (error) {
        return res.send({ success: false, message: "Error on user " });
      } else {
        console.log(result.length);
        if (result.length <= 0) {
          return res.send({
            success: false,
            message: "User is not verify... Please Verify your account first ",
          });
        } else {
          return res.send({ success: true });
        }
      }
    }
  );
});

//Pitch business of entrepreneur
app.post("/pitchbussines", (req, res) => {
  const bussinessName = req.body.bussinessName;
  const bussinesType = req.body.bussinesType;
  const bussinessCapital = req.body.bussinessCapital;
  const bussinessPhotoURL = req.body.bussinessPhotoURL;
  const bussinessDetails = req.body.bussinessDetails;
  const user_id = req.body.user_id;
  const bussiness = req.body.bussiness;
  const address =
    req.body.province + ", " + req.body.city + ", " + req.body.barangay;
  const MayorPermit = req.body.MayorPermit;
  const BIR = req.body.BIR;
  const BRGYClearance = req.body.BRGYClearance;
  const percent_remains = "100";
  const currentDate = new Date();
  const formattedDate = currentDate
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");
  db.query(
    "insert into business (buss_name, buss_type, buss_capital, buss_address, buss_photo, buss_details, buss_created_at,  buss_user_id, buss_percent_remains, buss_type_name ) value (?,?,?,?,?,?,?,?,?,?)",
    [
      bussinessName,
      bussinesType,
      bussinessCapital,
      address,
      bussinessPhotoURL,
      bussinessDetails,
      formattedDate,
      user_id,
      percent_remains,
      bussiness,
    ],
    (error, result) => {
      if (error) {
        return res.send({ sucess: false, message: "Error on pitching" });
      } else {
        const buss_id = result.insertId;

        db.query(
          "insert into bussinescredintails (buss_cred_mayor_permit, buss_cred_bir_regis, buss_cred_brgy_clearance, buss_cred_buss_id) value(?,?,?,?)",
          [MayorPermit, BIR, BRGYClearance, buss_id],
          (err, resuls) => {
            if (err) {
              return res.send({
                sucess: false,
                message: err.message,
              });
            } else {
              return res.send({
                sucess: true,
                message: "Busness sucessfully pitch",
              });
            }
          }
        );
      }
    }
  );
});

//Wala ni siyay labut
// app.post("/api/userInfo", (req, res) => {
//   const user_id = req.body.user_id;
//   db.query(
//     "select count(buss_id) as countofBusiness, user_profile_photo, usertbl.user_fname, usertbl.user_lname from business left join usertbl on business.buss_user_id = usertbl.user_id where buss_user_id = ? ",
//     user_id,
//     (error, result) => {
//       if (error) {
//         return res.send({ status: false, message: error });
//       } else {
//         return res.send({ status: true, result });
//       }
//     }
//   );
// });

// app.post("/api/businessPhoto", (req, res) => {
//   const user_id = req.body.user_id;
//   db.query(
//     "select buss_photo from business where buss_user_id =? ",
//     user_id,
//     (error, result) => {
//       if (error) {
//         return res.send({ status: false, message: error });
//       } else {
//         return res.send({ status: true, result });
//       }
//     }
//   );
// });

//This is to request all the business of the entrepreneur
app.post("/business", (req, res) => {
  const user_id = req.body.user_id;

  db.query(
    "select *  from business where business.buss_user_id = ?",
    user_id,
    (error, result) => {
      if (error) {
        return res.send(error);
      } else {
        return res.send(result);
      }
    }
  );
});

//This is to display all the business pitched by all the entrepreneur
//THis for for the investor feeds
app.get("/list", (req, res) => {
  const userType = "entrepreneur";
  const status = "Approved";
  db.query(
    "select business.*, usertbl.*, sum(investment.invst_amt) as totalAmountInvts  from business left join usertbl on usertbl.user_id=  business.buss_user_id left join investment on business.buss_id = investment.invst_buss_id  where buss_status = ? and usertbl.user_type = ? GROUP BY business.buss_id, usertbl.user_id order by business.buss_id  desc",
    [status, userType],
    (error, result) => {
      if (error) {
        return res.send({ success: false, error: error });
      } else {
        return res.send({ success: true, result });
      }
    }
  );
});

//Unsure asa ni siya
app.post("/api/business", (req, res) => {
  const userType = "entrepreneur";
  const bussId = req.body.businessId;
  db.query(
    "SELECT *, (SELECT COUNT(invst_id) FROM investment WHERE investment.invst_buss_id = business.buss_id) AS invstor_count FROM usertbl right JOIN business ON usertbl.user_id = business.buss_user_id LEFT JOIN investment ON business.buss_id = investment.invst_buss_id LEFT JOIN transactions ON investment.invst_trans_id = transactions.trans_id where user_type = ? && buss_id = ?",
    [userType, bussId],
    (error, result) => {
      if (error) {
        return res.send({ success: false, error: error });
      } else {
        return res.send({ success: true, result });
      }
    }
  );
});

//For deposite
app.post("/deposite", (req, res) => {
  const user_id = req.body.user_id;
  const amount = req.body.value;
  const type = req.body.descript;
  const created_at = req.body.timestamp;
  const email = req.body.email;

  const payee = req.body.payee;

  const paymentSource = req.body.paymentSource;
  if (amount > 0) {
    db.query(
      "insert into wallet(wlt_user_id, wlt_balance ) values (?,?) on duplicate key update wlt_balance = wlt_balance + ?",
      [user_id, amount, amount],
      (error, result) => {
        if (error) {
          return res.send({ sucess: false, message: "Error on deposite" });
        } else {
          db.query(
            "insert into transactions (trans_amt, trans_type, trans_email, trans_payee,  trans_wlt_user_id, trans_payment_source, trans_created_at) values(?,?,?,?,?,?,?)",
            [amount, type, email, payee, user_id, paymentSource, created_at],
            (err, resultData) => {
              if (err) {
                return res.send({
                  sucess: false,
                  message: err.message,
                });
              } else {
                return res.send({
                  sucess: true,
                  message: "Desposite Successfully",
                });
              }
            }
          );
        }
      }
    );
  }
});

//To get the balance
app.post("/balance", (req, res) => {
  const user_id = req.body.user_id;

  db.query(
    "select * from wallet where wlt_user_id = ?",
    user_id,

    (error, result) => {
      if (error) {
        return res.send({ success: false, error });
      } else {
        return res.send({ success: true, result, hasBalance: true });
      }
    }
  );
});

//For transaction
app.post("/transactions", (req, res) => {
  const user_id = req.body.user_id;

  db.query(
    "select * from transactions where trans_wlt_user_id = ?",
    user_id,

    (error, result) => {
      if (error) {
        return res.send({ success: false, error });
      } else {
        return res.send({ success: true, result });
      }
    }
  );
});
//For investing
app.post("/invest", (req, res) => {
  const selectBusinessId = req.body.selectBusinessId;
  const amountInvst = req.body.amountInvst;
  const user_id = req.body.user_id;
  const interest = req.body.interest;

  const month = req.body.month;

  const invstStat = "Request";
  const typeOfInvestment = "annuity";

  const currentDate = new Date();
  const formattedDate = currentDate
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");
  db.query(
    "insert into investment (invst_buss_id, invst_user_id, invst_amt, invst_status, invst_num_month, invst_interest, invst_type, invst_created_at) values(?,?,?,?,?,?,?,?)",
    [
      selectBusinessId,
      user_id,
      amountInvst,
      invstStat,
      month,
      interest,
      typeOfInvestment,
      formattedDate,
    ],
    (er, rs) => {
      if (er) {
        console.log(er);
        return res.send({
          sucess: false,
          message: "Error on invest investment",
        });
      } else {
        return res.send({
          sucess: false,
          message: "Successfully Invested",
        });
      }
    }
  );
});

//Enter the amount to investment
app.post("/investor/investamt", (req, res) => {
  const user_id = req.body.user_id;
  const invstId = req.body.invstId;
  const amount = req.body.amount;
  const Investoremail = req.body.Investoremail;
  const EntrpEmail = req.body.EntrpEmail;
  const type = "Invest";
  const paymentSource = "Bias Wallet";
  const investAmountSendStatus = "Send";
  const currentDate = new Date();
  const formattedDate = currentDate
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");
  db.query(
    "select * from wallet where wlt_user_id =? ",
    user_id,
    (error, result) => {
      if (error) {
        return res.send({ status: false, message: "Error on search wallet" });
      } else {
        if (result.length <= 0) {
          return res.send({
            status: false,
            message: "Your wallet has no balance",
          });
        } else {
          if (parseFloat(result[0].wlt_balance) < parseFloat(amount)) {
            return res.send({
              status: false,
              message: "Not enough balance",
            });
          } else {
            db.query(
              "update wallet set wlt_balance = wlt_balance - ? where wlt_user_id = ?",
              [parseFloat(amount), user_id],
              (error, result) => {
                if (error) {
                  return res.send({
                    status: false,
                    message: "Error on updating the wallet",
                  });
                } else {
                  db.query(
                    "insert into transactions (trans_amt, trans_type, trans_email, trans_payee, trans_wlt_user_id, trans_payment_source, trans_created_at) values(?,?,?,?,?,?,?)",
                    [
                      amount,
                      type,
                      Investoremail,
                      EntrpEmail,
                      user_id,
                      paymentSource,
                      formattedDate,
                    ],
                    (error, result) => {
                      if (error) {
                        return res.send({
                          status: false,
                          message: "Error on inserting in transactions",
                        });
                      } else {
                        db.query(
                          "update investment set invst_amount_send_status = ? where invst_id = ?",
                          [investAmountSendStatus, invstId],
                          (error, result) => {
                            if (error) {
                              return res.send({
                                status: false,
                                message: "Error updating investment",
                              });
                            } else {
                              return res.send({
                                status: true,
                                message: "Succuffky Invested",
                              });
                            }
                          }
                        );
                      }
                    }
                  );
                }
              }
            );
          }
        }
      }
    }
  );
});
// app.post("/api/getInstallment", (req, res) => {
//   const invst_id = req.body.invst_id;

//   db.query(
//     "select instll_data from installment where instll_invst_id = ?",
//     invst_id,
//     (error, result) => {
//       if (error) {
//         return res.send({ status: false, message: "No data found" });
//       } else {
//         return res.send({ status: true, result });
//       }
//     }
//   );
// });

// app.post("/api/updateInstallData", (req, res) => {
//   const invst_id = req.body.invst_id;
//   const instll_data = req.body.instll_data;
//   db.query(
//     "update installment set instll_data = ? where instll_invst_id = ?",
//     [instll_data, invst_id],
//     (error, result) => {
//       if (error) {
//         return res.send({ status: false, message: "Error on update" });
//       } else {
//         return res.send({
//           status: true,
//           message: "Investmet is update and Business is ready to start.",
//         });
//       }
//     }
//   );
// });

app.post("/api/UpdateBusinessStart", (req, res) => {
  const businessId = req.body.businessId;
  const buss_start_status = "started";
  db.query(
    "update business set buss_start = ? where buss_id = ? ",
    [buss_start_status, businessId],
    (error, result) => {
      if (error) {
        return res.send({ status: false, message: "Error on update business" });
      } else {
        return res.send({
          status: true,
          message: "Investmet is update and Business is ready to start.",
        });
      }
    }
  );
});
app.post("/api/getAccumulatedAmt", (req, res) => {
  const buss_id = req.body.buss_id;

  db.query(
    "select sum(investment.invst_amt) as totalAmt, buss_capital, buss_id from business inner join investment on business.buss_id = investment.invst_buss_id where buss_id = ?",
    buss_id,
    (error, result) => {
      if (error) {
        return res.send({ status: false, message: error.message });
      } else {
        return res.send({ status: true, result });
      }
    }
  );
});

//Tp view the investment
//This for investor
app.post("/investment", (req, res) => {
  const user_id = req.body.user_id;
  db.query(
    "select business.*, investment.*, installment.*, entrepreneur.user_fname  as entrepFname, entrepreneur.user_email  as entrepEmail, entrepreneur.user_lname as entrepLname, entrepreneur.user_mname as entrepMname, entrepreneur.user_contact_num as entrepContact, investorInfo.user_email as investorEmail from investment left join business on investment.invst_buss_id = business.buss_id left join usertbl as entrepreneur on business.buss_user_id = entrepreneur.user_id left join usertbl as investorInfo on investment.invst_user_id = investorInfo.user_id left join installment on investment.invst_id = instll_invst_id where invst_user_id = ? order by investment.invst_id desc",
    user_id,
    (err, result) => {
      if (err) {
        res.send({ status: false, message: err.message });
      } else {
        res.send({ status: true, result });
        //Display the total return amount for investors
      }
    }
  );
});

//View the investor that the entrepreneur will pay
app.post("/api/investortopay", (req, res) => {
  const user_id = req.body.user_id;
  db.query(
    "select usertbl.user_fname, usertbl.user_lname, business.*, investment.invst_start_date as startDate, investment.invst_end_date as endDate from business inner join investment on business.buss_id = investment.invst_buss_id  left join usertbl on investment.invst_user_id = usertbl.user_id where buss_user_id = ? order by business.buss_id",
    user_id,
    (error, result) => {
      if (error) {
        console.log(error);
        res.send({ status: false, message: error.message });
      } else {
        res.send({ status: true, result });
      }
    }
  );
});

//For uplaod a profile picture of the users
app.post("/api/uploadPhoto", (req, res) => {
  const url = req.body.url;
  const user_id = req.body.user_id;
  db.query(
    "update usertbl set user_profile_photo = ? where user_id = ?",
    [url, user_id],
    (error, result) => {
      if (error) {
        return res.send({ status: false, message: error.message });
      } else {
        return res.send({
          status: false,
          message: "Profile change sucessfully...",
        });
      }
    }
  );
});

//This is to view the investors of the entrepreneur business
app.post("/api/viewBusinessInvestors", (req, res) => {
  const user_id = req.body.user_id;
  const businessId = req.body.businessId;
  db.query(
    "select *, usertbl.user_fname, usertbl.user_lname, usertbl.user_mname from investment left join business on investment.invst_buss_id = business.buss_id left join usertbl on investment.invst_user_id = usertbl.user_id where buss_user_id = ?",
    [user_id],
    (error, result) => {
      if (error) {
        return res.send({ status: false, message: error.message });
      } else {
        return res.send({ status: true, result });
      }
    }
  );
});

app.post("/api/send/installment", (req, res) => {
  const invst_id = req.body.invst_id;
  const loanObjec = req.body.loanObjec;
  const instllInterestSum = req.body.instllInterestSum;
  const installSum = req.body.installSum;
  const status = "Approved";

  db.query(
    "update investment set invst_status = ? where invst_id = ?",
    [status, invst_id],
    (error, result) => {
      if (error) {
        return res.send({ status: false, message: error.message });
      } else {
        db.query(
          "insert into installment (instll_invst_id, instll_data, instll_interestSum, instll_sum) values(?,?,?,?)",
          [invst_id, loanObjec, instllInterestSum, installSum],
          (error, result) => {
            if (error) {
              return res.send({ status: false, message: error.message });
            } else {
              return res.send({ status: true });
            }
          }
        );
      }
    }
  );
});

app.post("/api/view/investment", (req, res) => {
  const invst_id = req.body.invest_id;

  db.query(
    "select * from usertbl inner join investment on usertbl.user_id = investment.invst_user_id where investment.invst_id = ?",
    invst_id,
    (error, result) => {
      if (error) {
        return res.send({ status: false, message: error.message });
      } else {
        return res.send({ status: true, result });
      }
    }
  );
});

//Display the investment that the entrepreneur will be
//WIth starting date to end date.
app.post("/api/request/investmentPayDetails", (req, res) => {
  const invst_id = req.body.invst_id;

  db.query(
    "select invst_start_date as startDate, invst_end_date as endDate, trans_amt as investAmt, invst_interest as interest, invst_num_year as yearofInvestment from investment inner join transactions on investment.invst_trans_id = transactions.trans_id where invst_id = ?",
    invst_id,
    (error, result) => {
      if (error) {
        return res.send({ status: false, message: error.message });
      } else {
        //console.log(result[0].investAmt);
        const NumofMonthinYear = 12;
        const numYear = result[0].yearofInvestment;
        const totalMonthofInvestmentToPay =
          parseInt(numYear) * parseInt(NumofMonthinYear);
        const totalAmount =
          parseInt(result[0].investAmt) + parseInt(result[0].interest);
        const totalAmtMonthly = totalAmount / totalMonthofInvestmentToPay;

        return res.send({
          status: true,
          startDate: result[0].startDate,
          endDate: result[0].endDate,
          totalAmtMonthly: totalAmtMonthly.toFixed(2),
          totalAmount: totalAmount,
        });
      }
    }
  );
});

app.post("/api/returnPayment", (req, res) => {
  const invst_id = req.body.invst_id;
  const amount = req.body.amount;
  const user_id = req.body.user_id;
  const type = "distribution";
  const currency = "PHP";
  const status = "COMPLETED";
  const paymentSource = "Bias Wallet";
  const currentDate = new Date();
  const formattedDate = currentDate
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");
  db.query(
    "select * from wallet where wlt_user_id = ?",
    user_id,
    (e, results) => {
      if (e) {
        return res.send({ status: false, message: "Error on wallet" });
      } else {
        if (results[0].wlt_balance > amount) {
          db.query(
            "update wallet set wlt_balance = wlt_balance - ? where wlt_user_id = ?",
            [amount, user_id],
            (err, result) => {
              if (err) {
                return res.send({
                  status: false,
                  message: err.message,
                });
              } else {
                db.query(
                  "select user_email from usertbl inner join investment on usertbl.user_id = investment.invst_user_id where invst_id = ?",
                  invst_id,
                  (error, rslt) => {
                    if (error) {
                      return res.send({
                        status: false,
                        message: error.message,
                      });
                    } else {
                      const payee = rslt[0].user_email;

                      db.query(
                        "insert into transactions (trans_amt, trans_type, trans_currency, trans_payee, trans_status, trans_wlt_user_id, trans_payment_source, trans_created_at) values(?,?,?,?,?,?,?,?)",
                        [
                          amount,
                          type,
                          currency,
                          payee,
                          status,
                          user_id,
                          paymentSource,
                          formattedDate,
                        ],
                        (errors, rslts) => {
                          if (errors) {
                            console.log(errors);
                            return res.send({
                              status: false,
                              message: errors.message,
                            });
                          } else {
                            const trans_id = rslts.insertId;
                            db.query(
                              "insert into returnearnings (rtrn_trans_id, rtrn_invst_id, rtrn_amt, rtrn_created_at) values(?,?,?,?)",
                              [trans_id, invst_id, amount, formattedDate],
                              (errs, reslts) => {
                                if (errs) {
                                  return res.send({
                                    status: false,
                                    message: errs.message,
                                  });
                                } else {
                                  return res.send({
                                    status: true,
                                    message: "Amount Return Sucessfully",
                                  });
                                }
                              }
                            );
                          }
                        }
                      );
                    }
                  }
                );
              }
            }
          );
        } else {
          return res.send({
            status: false,
            message: "Insufficient Balance",
          });
        }
      }
    }
  );
});

app.post("/returnsDates", (req, res) => {
  const invest_id = req.body.invst_id;

  db.query(
    "select * from installment where instll_invst_id = ?",
    invest_id,
    (error, result) => {
      if (error) {
        return res.send({
          status: false,
          message: err.message,
        });
      } else {
        return res.send({ status: true, result });
      }
    }
  );
});

app.post("/returnHistory", (req, res) => {
  const invest_id = req.body.invst_id;
  const user_id = req.body.user_id;
  db.query(
    "select * from installmentpayment inner join installment on installmentpayment.installpayment_install_id = installment.instll_id where installpayment_user_id_pay = ? and installment.instll_invst_id = ?",
    [user_id, invest_id],
    (error, result) => {
      if (error) {
        return res.send({
          status: false,
          message: err.message,
        });
      } else {
        return res.send({ status: true, result });
      }
    }
  );
});

app.post("/api/returnhistory", (req, res) => {
  const invest_id = req.body.invst_id;

  db.query(
    "select * from returnearnings where rtrn_invst_id = ?",
    invest_id,
    (error, result) => {
      if (error) {
        return res.send({
          status: false,
          message: err.message,
        });
      } else {
        return res.send({ status: true, result });
      }
    }
  );
});

app.post("/checkInstallmentPayment", (req, res) => {
  const intll_id = req.body.intll_id;

  db.query(
    "select * from installmentpayment where installpayment_install_id = ?",
    intll_id,
    (error, result) => {
      if (error) {
        return res.send({ status: false, message: error.message });
      } else {
        return res.send({ status: true, result });
      }
    }
  );
});

app.post("/sendMessage", (req, res) => {
  const message = req.body.message;
  const chat_id = req.body.chat_id;
  const senderId = req.body.senderId;
  const currentDate = new Date();
  const formattedDate = currentDate
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");

  db.query(
    "insert into messages (msg_content, msg_user_sends, msg_chats_id, msg_datetime) values(?,?,?,?)",
    [message, senderId, chat_id, formattedDate],
    (err, results) => {
      if (err) {
        return res.send({
          status: false,
          message: "Error on inserting message 2",
        });
      } else {
        return res.send({
          status: true,
        });
      }
    }
  );
});

app.post("/chatcontact", (req, res) => {
  const userId = req.body.userId;
  const recieverId = req.body.recieverId;
  db.query(
    "SELECT CR.*, U1.user_fname AS user1_name, U2.user_fname AS user2_name, M.msg_content AS last_message, M.msg_datetime AS last_message_timestamp FROM chats AS CR INNER JOIN usertbl AS U1 ON CR.cht_user_id_f = U1.user_id INNER JOIN usertbl AS U2 ON CR.cht_user_id_s = U2.user_id INNER JOIN messages AS M ON CR.cht_id = M.msg_chats_id WHERE (U1.user_id = ? OR U2.user_id = ?) AND M.msg_datetime = (SELECT MAX(msg_datetime) FROM messages AS sub WHERE sub.msg_chats_id = CR.cht_id)",
    [userId, userId],
    (error, result) => {
      if (error) {
        return res.send({ status: false, message: "Error" });
      } else {
        return res.send({ status: true, result });
      }
    }
  );
});

app.post("/messages", (req, res) => {
  const chat_id = req.body.chat_id;
  db.query(
    "select * from messages where msg_chats_id  = ? order by msg_id desc",
    [chat_id],
    (error, result) => {
      if (error) {
        return res.send({ status: false, message: error });
      } else {
        return res.send({ status: true, result });
      }
    }
  );
});

app.post("/userchatroom", (req, res) => {
  const chat_id = req.body.chat_id;
  db.query(
    "SELECT CR.*, U1.user_fname AS user1_name, U2.user_fname AS user2_name FROM chats AS CR INNER JOIN usertbl AS U1 ON CR.cht_user_id_f = U1.user_id INNER JOIN usertbl AS U2 ON CR.cht_user_id_s = U2.user_id  WHERE CR.cht_id =  ?",
    [chat_id],
    (error, result) => {
      if (error) {
        return res.send({ status: false, message: "Error" });
      } else {
        return res.send({ status: true, result });
      }
    }
  );
});

app.post("/api/create-chat-room", (req, res) => {
  const senderId = req.body.user_id;
  const recieverId = req.body.recieverId;

  db.query(
    "select * from chats where cht_user_id_f = ? and cht_user_id_s = ?  or cht_user_id_f = ? and cht_user_id_s = ? ",
    [senderId, recieverId, recieverId, senderId],
    (error, result) => {
      if (error) {
        return res.send({
          status: false,
          message: "Error on select chat room",
        });
      } else {
        if (result.length > 0) {
          return res.send({
            status: true,
            hasRoom: true,
            roomId: result[0].cht_id,
          });
        } else {
          db.query(
            "insert into chats (cht_user_id_f, cht_user_id_s) values(?,?)",
            [senderId, recieverId],
            (err, reslt) => {
              if (err) {
                return res.send({
                  status: false,
                  message: "Error on creating chat room",
                });
              } else {
                return res.send({ status: true, hasRoom: false });
              }
            }
          );
        }
      }
    }
  );
});

app.post("/acceptInvetment", (req, res) => {
  const invest_id = req.body.invest_id;
  const accept = req.body.status;
  db.query(
    "update investment set invst_status = ? where invst_id = ? ",
    [accept, invest_id],
    (error, result) => {
      if (error) {
        return res.send({ status: false, message: error.message });
      } else {
        return res.send({
          status: true,
          message: "Investment Accepted Successfully",
        });
      }
    }
  );
});

app.post("/user/myprofile", (req, res) => {
  const user_id = req.body.user_id;

  db.query(
    "select * from usertbl where user_id =?",
    user_id,
    (error, result) => {
      if (error) {
        return res.send({
          status: false,
          message: "Error on fecthing the data",
        });
      } else {
        return res.send({ status: true, result });
      }
    }
  );
});

app.post("/uploadVerify", (req, res) => {
  const front = req.body.front;
  const back = req.body.back;
  const user = req.body.user;
  const user_id = req.body.user_id;
  const timestamp = req.body.date;
  const idType = req.body.idType;
  db.query(
    "insert into indentificationcard (idt_id_photo_url_front, idt_id_photo_url_back, idt_id_type, idt_user_picture,idt_user_id,idt_timestamp) values(?,?,?,?,?,?)",
    [front, back, idType, user, user_id, timestamp],
    (error, result) => {
      if (error) {
        return res.send({
          status: false,
          message: "Error on inserting data",
        });
      } else {
        return res.send({ status: true, message: "Succefully Sumbmited" });
      }
    }
  );
});

app.post("/getNotif", (req, res) => {
  const user_id = req.body.user_id;
  const status = "not read";
  db.query(
    "select * from notifications where notif_user_id = ? and notif_status = ?",
    [user_id, status],
    (error, result) => {
      if (error) {
        return res.send({ status: false, message: error.message });
      } else {
        return res.send({ status: true, result });
      }
    }
  );
});

app.post("/investor/acepptInstallment", (req, res) => {
  const instll_id = req.body.instll_id;
  const status = "Approved";
  db.query(
    "update installment set instll_invst_approval = ? where instll_id = ?",
    [status, instll_id],
    (error, result) => {
      if (error) {
        return res.send({
          status: false,
          message: "Error ",
        });
      } else {
        return res.send({ status: true, message: "Succesffuly inserted" });
      }
    }
  );
});

app.post("/client/insertNotif", (req, res) => {
  const id = req.body.id;
  const type = req.body.type;
  const content = req.body.content;
  const currentDate = new Date();
  const status = "not read";

  const formattedDate = currentDate
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");
  db.query(
    "insert into notifications (notif_user_id, notif_type, notif_content, notif_status, notif_timestamp) values(?,?,?,?,?)",
    [id, type, content, status, formattedDate],
    (error, result) => {
      if (error) {
        return res.send({
          status: false,
          message: "Error on inserting in notification",
        });
      } else {
        return res.send({ status: true, message: "Succesffuly inserted" });
      }
    }
  );
});
