var channel_access_token = "********************************************************************************************************************************************************";
var address = "************";
var domain = "************";
var sheet_id = "**********************************************";
var log_sheet_id = "**************************************************";
var profile_url = "https://api.line.me/v2/bot/profile/{userId}";

//Postされると発火する
function doPost(e) {
  log("doPost");
  var events = JSON.parse(e.postData.contents).events;
  var ss0 = SpreadsheetApp.openById(log_sheet_id).getSheets()[0];
  var ss = SpreadsheetApp.openById(sheet_id);
  
  events.forEach(function(event) {
    var id;
    if(event.source.type=="user"){
      id = event.source.userId;
    } else if(event.source.type=="group"){
      id = event.source.groupId;
    } else if(event.source.type=="room"){
      id = event.source.roomId;
    }
    
    if(event.type == "message"){
      log("event.type == message");      
      
      if(event.message.type=="text"){
        getNameAndSendMail(event.message.text, id);
      }
      
    } else if(event.type == "follow"){
      // 友だち追加・ブロック解除
      ss0.appendRow(["発火: 友達追加・ブロック解除"]);
      addFriend("unknown", id);
      
    } else if(event.type == "unfollow"){
      // ブロック
      ss0.appendRow(["発火: ブロック"]);
      removeRaw(ss, id, "user");
      
    } else if(event.type == "join"){
      //グループ・トークルーム参加
      addFriend("unknown", id);
    }
 });
}


///////////////////////////////////////////////////////////
//           汎用メソッド
///////////////////////////////////////////////////////////

function getNameAndSendMail(msg, id){
  log("getNameAndSendMail()");
  var name = askFriendName(id);
  if(name != "error"){
    sendMail(msg, name);
  }
}

function log(msg){
  var ss0 = SpreadsheetApp.openById(log_sheet_id).getSheets()[0];
  ss0.appendRow(["発火", msg]);
}

function sendMail(msg, subject){
  Logger.log("発火 sendMail() msg: " + msg);
  MailApp.sendEmail(address + "@" + domain, subject, msg);
}


///////////////////////////////////////////////////////////
//　　　　　　　　　スプレッドシート読み書き系メソッド
///////////////////////////////////////////////////////////

function findRow(sheet,val,col){ 
  var dat = sheet.getDataRange().getValues(); //受け取ったシートのデータを二次元配列に取得
 
  //SpreadSheetの起数は行・列ともに1
  for(var i=0;i<dat.length;i++){
    if(dat[i][col-1] === val){
      return i+1;
    }
  }
  return 0;
}

function getFriendName(sheet,val,col){
  var dat = sheet.getDataRange().getValues(); //受け取ったシートのデータを二次元配列に取得
 
  for(var i=0;i<dat.length;i++){
    if(dat[i][col-1] === val){
      return dat[i][col-2];
    }
  }
  return null;
}

function addFriend(name, user_id){
  var data_sheet = SpreadsheetApp.openById(sheet_id).getSheetByName("user");
  var name = askFriendName(user_id);
  if(name != "error"){
    data_sheet.appendRow([name, user_id]);
  } else {
    log("name == error");
    data_sheet.appendRow(["unknown", user_id]);
  }
}

function removeRaw(ss, user_id, sheet_name){
  var user_ss = ss.getSheetByName(sheet_name);
  var raw = findRow(user_ss, user_id, 2);
  user_ss.deleteRow(raw);
}

function askFriendName(id){
  log("askFriendName id:" + id);
  
  var url = profile_url.replace("{userId}", id);
  var responce = UrlFetchApp.fetch(url, makeOption("askFriendName"));
  var name;
  
  if(responce.getResponseCode() == 200){
    var data = JSON.parse(responce);
    if(data.userId == id){
      name = data.displayName;
    } else {
      name = "unknown";
    }
  } else {
    log("askFriendName() id: " + id + " responceMsg: " + responce.getContentText());
    name = "error";
  }
  
  return name;
}


//////////////////////////////////////////////////////////
//        時間トリガで、定期的にGmailをチェックする系メソッド
//
//ガラケーからメールでコマンドを送ると、コマンドに応じて動作してくれる。
//gmail側の設定で、ガラケーのメアドからのメールに"linebot"というラベルとスターを自動的に貼るようにしてある。
//メールをチェックしたらスターを外すことで、スターの有無でそのメールをチェックしたかどうかを見分けられるようにしてある。
//コマンドは、
//メールの題名が"友達一覧"⇒アカウント名の一覧をガラケーに送信する
//メールの題名が"友達一覧"ではない⇒アカウント名でスプレッドシートから記録したidを検索し、idがあればpushAPIを叩く
//////////////////////////////////////////////////////////

function checkGmail(){
  var start = 0;
  var max = 500;
  var threads = GmailApp.search("label:linebot",start,max);
  var ss = SpreadsheetApp.getActiveSheet();
  var row = ss.getLastRow() + 1;
  var user_ss = SpreadsheetApp.openById(sheet_id).getSheetByName("user");
  
  //ラベルに合致したメールをひとつづつ取得する
  for(var n in threads){
    var msgs = threads[n].getMessages();
    for(m in msgs){
      if(msgs[m].isStarred()){
        var mail = address + "@" + domain;
        if(from == mail){
          if(subject == "友達一覧"){
            //友達一覧を返す
            log("subject == 友達一覧");
            var dat = user_ss.getDataRange().getValues();
            var arr_msg = makeAllFriendArr(dat);
            sendMail(arr_msg, "友達一覧");
          }
        } else {
          var name = subject.replace("Re:", "").replace(" ", "");
          log("name: " + name);
          var row = findRow(user_ss, name, 1);
          if(row == 0){
            log("そんなアカウント名は存在しません！");
            sendMail("そんなアカウント名は存在しません！", "エラー");
          } else {
            //idが取得できたのでpush通知する
            var ss = SpreadsheetApp.openById(sheet_id).getSheetByName("user");
            var id = ss.getRange(row, 2).getValue();
            log(id);
            linePush(id, body);
          }
        }
        
        msgs[m].unstar();
        row++;
      }
    }
  }
}

function makeAllFriendArr(dat){
  log("makeAllFriendArr dat:" + dat);
  var arr = [];
  for(var i=0; i<dat.length; i++){
    var set = dat[i][0] + ", ";
    arr.push(set);
  }
  return arr.join("");
}


/////////////////////////////////////////////////////////////////
//                    API叩く系のメソッド
/////////////////////////////////////////////////////////////////

function linePush(id, text){
  log("linePush");
  
  var postData = {
    "to" : id,
    "messages" : [
      {
        "type" : "text",
        "text" : text
      }
    ]
  };
  
  var responce = UrlFetchApp.fetch("https://api.line.me/v2/bot/message/push", makeOption(postData));
  log(responce.getContentText() + "__" + responce.getResponseCode());
}

function lineReply(e, text) {
  log("lineReply");
  
  var postData = {
    "replyToken" : e.replyToken,
    "messages" : [
      {
        "type" : "text",
        "text" : text
      }
    ]
  };

  var responce = UrlFetchApp.fetch("https://api.line.me/v2/bot/message/reply", makeOption(postData));
  log(responce.getContentText() + "__" + responce.getResponseCode());
}


function makeOption(postData){
  log("makeOption()");
  
  var options;
  if(postData != "askFriendName"){
    options = {
      "method" : "post",
      "headers" : {
        "Content-Type" : "application/json",
        "Authorization" : "Bearer " + channel_access_token
      },
      "payload" : JSON.stringify(postData)
    };
    
  } else {
    options = {
      "muteHttpExceptions" : true,
      "headers" : {
        "Authorization" : "Bearer " + channel_access_token
      }
    };
  }
  
  return options;
}
