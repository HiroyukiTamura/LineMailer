# LineMailer  
LINE Massage APIを使って、ライン・ガラケー間でメッセージを中継するbotです。  
  
# やっていること  
・LINEからwebhook受信⇒⇒Profile APIからアカウント名を取得⇒メール送信
グループ/トークルーム招待時にはユーザ名"unknown"として書き込み、後で手作業で名前を書き込む（泣）。  
  
・メアドからGmailにメール送信⇒5分に1回メールを検索して指定のメアドからの新規メールがあればline送信  
メールの題名が「友達一覧」であれば、SpreadSheetに記録してある友達のリストを返信する  
メールの題名がそれ以外であれば、SpreadSheetに記録してあるリストからIdを取得してPushAPIを叩く  
  
・適宜ログをspreedsheetに書き込み  

# 図にすると
1. トークでwebhook受信
![logic-1](https://c1.staticflickr.com/5/4288/35050363136_cba08c034a_b.jpg)
2. グループ・トークルームでwebhook受信
![logic-2](https://c1.staticflickr.com/5/4210/35050362686_fd0bd60b50_b.jpg)
3. ガラケーからメッセージ送信
![logic-3](https://c1.staticflickr.com/5/4234/35050363036_445ea25c2b_b.jpg)
  
# 長所  
・googleAppsScriptを使っているのでサーバレスで構築できる。SSL証明書も不要。  
  
# 欠点  
・プログラムの実行にかかる時間が割と長く(3-4秒)、高頻度でやりとりしたときにちゃんと実行されるか不安。それもあって1分ごとではなく5分ごとに実行している。 
・せっかく公式がsdkを出しているのに使ってない。  
  
#新卒（18卒）で僕を雇って下さい（マジで）  
詳しくは以下をご覧くださいm(__)m  
http://freqmodu874.hatenadiary.com/entry/2017/03/16/033450
