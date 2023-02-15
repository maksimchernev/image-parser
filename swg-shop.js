const axios = require("axios"); // Подключение модуля axios для скачивания страницы
const jsdom = require("jsdom"); // Подключение модуля jsdom для работы с DOM-деревом (1)
const { imageDataGenerator, wait, writeFiles } = require("./functions");
const { JSDOM } = jsdom; // Подключение модуля jsdom для работы с DOM-деревом (2)

const baseLink = 'https://swgshop.ru/search/?q='

const parseItem = async(article, articuls, title, itemLink) => {
  let arts = articuls
  let imagesData
  if (title.match(article)) {
    console.log("Запрос по Внутренней ссылке: " + itemLink);
    let responseSub = await axios.get(itemLink)
    let itemPage = responseSub.data; // Запись полученного результата
    const domSub = new JSDOM(itemPage); // Инициализация библиотеки jsdom для разбора полученных HTML-данных, как в браузере
    const documentSub = domSub.window.document;
    let itemData = documentSub.getElementsByClassName('element__data')[0]
        .getElementsByClassName('item element__item')[0]
        .getElementsByClassName('container')[0]
        .getElementsByClassName('item__main row')[0]
    let atrAnotherTry = itemData
        .getElementsByClassName('item__content')[0]
        .getElementsByClassName('item__header')[0]
        .getElementsByClassName('item__code')[0].innerHTML
        .split(' ')[1]
    console.log('atrAnotherTry', atrAnotherTry) 
    if((atrAnotherTry && arts.includes(atrAnotherTry))) {
      /* пути */
      console.log('found')
      let slider = itemData.getElementsByClassName('item__image-col')[0]
            .getElementsByClassName('item__image-nav-wrap')[0]
            .getElementsByClassName('item__image-nav')[0]
            .getElementsByClassName('item__image-nav-item')
            console.log('slider', slider)
        const imgUrlsForWP = []
        for (let i = 0; i<slider.length; i++) {
            let url = slider[i].getElementsByClassName('item__image-nav-img-placeholder')[0].getElementsByTagName('img')[0].getAttribute("src")
            let urlAbs = url.replace("/", "https://swgshop.ru/");
            imgUrlsForWP.push(urlAbs)
        }
        imagesData = imageDataGenerator((atrAnotherTry).toString(), imgUrlsForWP)
        arts = arts.filter((articul)=> {
            return articul != atrAnotherTry
        })
        console.log('articuls', articuls)
    }
  } 
  return {imagesData, arts}
}

const parseSWG = async(articulsToBeFound) => {
  let articuls = articulsToBeFound
  let imageDataArr = []
  let foundAll = false
  for (let article of articulsToBeFound) {
    let link = baseLink+article; // Конструктор ссылки на страницу со статьями для запроса по не
    console.log("Запрос по ссылке: " + link); // Уведомление о получившейся ссылке
    // Запрос к странице сайта
    let response = await axios.get(link)
    var currentPage = response.data; // Запись полученного результата
    const dom = new JSDOM(currentPage); // Инициализация библиотеки jsdom для разбора полученных HTML-данных, как в браузере
    const document = dom.window.document; // Инициализация библиотеки jsdom для разбора полученных HTML-данных, как в браузере
    // Определение количества ссылок на странице, потому что оно у них не всегда фиксированное. Это значение понадобится в цикле ниже
    let links = document.getElementsByClassName("catalog__section-tiles")[0]
    if (links) {
        links = links.getElementsByClassName("catalog__section-item");
        let linksLength = links.length;
        console.log('linksLength', linksLength)
        // Перебор и запись всех статей на выбранной странице
        for (let i = 0; i < linksLength && !foundAll; i++) {
          let title = links[i].getElementsByClassName("catalog-tile__title")[0].innerHTML
          //let type = links[i].getElementsByClassName("ext")[0].getElementsByClassName("type")[0].getElementsByTagName('span')[0].innerHTML
          console.log('title', title)
          let relLink = links[i].getElementsByTagName('a')[0].getAttribute("href")
          // Превращение ссылок в абсолютные
          let itemLink = relLink.replace("/", "https://swgshop.ru/");
          let {imagesData, arts} = await parseItem(article, articuls, title, itemLink)
          console.log('imagesData', imagesData)
          imageDataArr = imageDataArr.concat(imagesData)
          articuls = arts
            console.log('imageDataArr', imageDataArr)
          if (articuls.length == 0) {
            foundAll = true
          }
          await wait(100)   
        }
    }
  }


  if (!articuls.length) {
    await writeFiles(imageDataArr)
    console.log("Все товары найдены, парсинг завершен.");
  } else if (articuls.length < articulsToBeFound.length){
    await writeFiles(imageDataArr)
    console.log('Не были найдены следующие артикулы: ', articuls);
  } else {
    console.log("Артикулы не найдены!");
  }
  foundAll = false
  page = 1
  pagesNumber = 1
  return (articuls)
}
/* const articulsToBeFound= ['014779']
parseSWG(articulsToBeFound) */
module.exports = parseSWG