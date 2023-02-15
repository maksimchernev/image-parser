const axios = require("axios"); // Подключение модуля axios для скачивания страницы
const fs = require("fs"); // Подключение встроенного в Node.js модуля fs для работы с файловой системой
const { isEmpty } = require("lodash");
process.env.NTBA_FIX_319 = 1;
process.env.NTBA_FIX_350 = 1;
const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();
const token = process.env.TG_KEY;
const bot = new TelegramBot(token, {polling: true});
const parseTransistorRu = require('./transistor')
const parseMaytoniRu = require('./maytoni')
const parseNovotechShopRu = require('./novotech')
const parseDonoluxRu = require('./donolux')
const parse6063 = require('./6063-light')
const parseSWG = require('./swg-shop');
const parseArtelamp = require("./artelamp");
const parseTechnolight = require("./technolight");


async function download(url, filepath) {
    const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream'
    });
    return new Promise((resolve, reject) => {
        response.data.pipe(fs.createWriteStream(filepath))
            .on('error', reject)
            .once('close', () => resolve(filepath)); 
    });
  }
let allowedIds = [422689325, -797023226, 384569274]
const checkPermission = (msg) => {
    let allowedPerson
    let allowedChat
    for (let id of allowedIds) {
        if (msg.chat.id === id) {
            allowedChat = true
        }
        if (msg.from.id === id) {
            allowedPerson = true
        }
    }
    return {allowedPerson, allowedChat}
}

bot.onText(/\/start/, (msg) => {
    let {allowedPerson, allowedChat} = checkPermission(msg)
    if (allowedChat && allowedPerson) {
        bot.sendMessage(msg.chat.id, 'Введите значения артикулов в сообщении или отправьте в файле формата .csv или .json. Далее выберите необходимый для парсинга вебсайт.')
        
    }
});


let data 



bot.on('message', async (msg) => {
    //console.log(msg)
    if (!msg.text && !msg.document) {
        return bot.sendMessage(msg.chat.id, `Неизвестный формат`)
    }
    if (msg.text) {
        let re = /\s*(?:;|,|\n|$)\s*/
        data = msg.text.split(re)
    } else if (msg.document) {
        const fileId = msg.document.file_id;
        // an api request to get the "file directory" (file path)
        const res = await axios.get(
        `https://api.telegram.org/bot${process.env.TG_KEY}/getFile?file_id=${fileId}`
        );
        // extract the file path
        console.log('res', res.data.result.file_path)
        const filePath = res.data.result.file_path;

        // now that we've "file path" we can generate the download link
        const downloadURL = 
        `https://api.telegram.org/file/bot${process.env.TG_KEY}/${filePath}`;
        const format = JSON.stringify(filePath).slice(filePath.indexOf('.')+2,-1)
        if (format != 'csv') {
            return bot.sendMessage(msg.chat.id, `Неизвестный формат`)
        }
        let file = await download(downloadURL, `./doc.${format}`)
        data = fs.readFileSync(file, "utf8").split(/\r\n|\n/).filter(item => item != 'Артикул').map(item => item.trim());        
    } 
    bot.sendMessage(msg.chat.id, `Выберите сайт для парсинга изображений`, {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: 'Transistor.ru',
                callback_data: 'Transistor.ru'
              },
              {
                text: 'Maytoni.ru',
                callback_data: 'Maytoni.ru'
              }
            ], [
              {
                text: 'Novotech-shop.ru',
                callback_data: 'Novotech-shop.ru'
              },
              {
                text: '6063-light.com',
                callback_data: '6063-light.com'
              },
            ],[
              {
                text: 'Donolux.ru: Системы освещения',
                callback_data: 'Donolux.ru'
              },
            ]
            ,[
              {
                text: 'Donolux.ru: Весь каталог',
                callback_data: 'Donolux.ru extended'
              },
              {
                text: 'Swgshop.ru',
                callback_data: 'Swgshop.ru'
              }
            ]
            ,[
              {
                text: 'Artelamp.ru',
                callback_data: 'Artelamp.ru'
              },
              {
                text: 'Technolight.ru',
                callback_data: 'Technolight.ru'
              }
            ]
          ]
        }
    });
})

bot.on("polling_error", console.log);

bot.on('callback_query', async (query) => {
  const id = query.message.chat.id;
    if (isEmpty(data) || !data) {
        bot.sendMessage(id, `Введите значения артикулов в сообщении или отправьте в файле формата .csv`)
    } else {
      console.log('data', data)
      let articuls
      if(query.data == 'Transistor.ru') {    
          bot.sendMessage(id,"Ожидание... 3 минуты");
          articuls = await parseTransistorRu(data)
          if (!data) {
            bot.sendMessage(id,"ошибка, возможно вы нажали 2жды");
            return
          }
      } else if (query.data == 'Maytoni.ru') {
          bot.sendMessage(id,"Ожидание... 3 минуты");
          articuls = await parseMaytoniRu(data)
          if (!data) {
            bot.sendMessage(id,"ошибка, возможно вы нажали 2жды");
            return
          }
          
      } else if (query.data == 'Novotech-shop.ru') {
          bot.sendMessage(id,"Ожидание... 3 минуты");
          articuls = await parseNovotechShopRu(data)
          if (!data) {
            bot.sendMessage(id,"ошибка, возможно вы нажали 2жды");
            return
          }
      } else if (query.data == 'Donolux.ru') {
        bot.sendMessage(id,"Ожидание... 3 минуты");
        articuls = await parseDonoluxRu(data, 'https://donolux.ru/produktsiya/sistemyi-osvescheniya')
        if (!data) {
          bot.sendMessage(id,"ошибка, возможно вы нажали 2жды");
          return
        }
      } else if (query.data == 'Donolux.ru extended') {
        bot.sendMessage(id,"Ожидание... 20 минут");
        articuls = await parseDonoluxRu(data, 'https://donolux.ru/produktsiya')
        if (!data) {
          bot.sendMessage(id,"ошибка, возможно вы нажали 2жды");
          return
        }
      } else if (query.data == '6063-light.com') {
        bot.sendMessage(id,"Ожидание... 3 минуты");
        articuls = await parse6063(data)
        if (!data) {
            bot.sendMessage(id,"ошибка, возможно вы нажали 2жды");
            return
        }
      } else if (query.data == 'Swgshop.ru') {
        bot.sendMessage(id,"Ожидание... 3 минуты");
        articuls = await parseSWG(data)
        if (!data) {
            bot.sendMessage(id,"ошибка, возможно вы нажали 2жды");
            return
        }
      } else if (query.data === 'Artelamp.ru') {
        bot.sendMessage(id,"Ожидание... 3 минуты");
        articuls = await parseArtelamp(data)
        if (!data) {
            bot.sendMessage(id,"ошибка, возможно вы нажали 2жды");
            return
        }
      } else if (query.data === 'Technolight.ru') {
        bot.sendMessage(id,"Ожидание... 3 минуты");
        articuls = await parseTechnolight(data)
        if (!data) {
            bot.sendMessage(id,"ошибка, возможно вы нажали 2жды");
            return
        }
      }
      if (!articuls.length) {
        bot.sendMessage(id,"Все товары найдены, парсинг завершен.");
        bot.sendDocument(id, "./files.zip")
      } else if (articuls.length < data.length){
        bot.sendMessage(id,`Не были найдены следующие артикулы: ${articuls}` );
        bot.sendDocument(id, "./files.zip")
      } else {
        bot.sendMessage(id,"Артикулы не найдены!");
      }
      data = null
    }
})

