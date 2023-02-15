const axios = require("axios"); // Подключение модуля axios для скачивания страницы
const jsdom = require("jsdom"); // Подключение модуля jsdom для работы с DOM-деревом (1)
const { JSDOM } = jsdom; // Подключение модуля jsdom для работы с DOM-деревом (2)
const { attributesGenerator, imageDataGeneratorWithAttributes, wait, writeFiles } = require("./functions");

/* выполнняет поиск по рядам таблицы */
function findAttributes(productProperties, attributeName, orAttrName = ''){
  let propertiesLength = productProperties.length
  for (let i = 0; i < propertiesLength; i++) {
      let condition = productProperties[i].getElementsByTagName('td')[0].getElementsByClassName('p-features-table-name')[0].getElementsByTagName('span')[0].innerHTML 
      if (condition == attributeName || (orAttrName && condition == orAttrName)) {
          let atrValue = productProperties[i].getElementsByTagName('td')[1].innerHTML
          return Number(atrValue.replace(',', '.').match(/(?<=^| )\d+(\.\d+)?(?=$| )/)[0])
      }
  }
}

const baseLink = 'https://novotech-shop.ru/trekovye/?page='
let page = 1; // Номер первой страницы для старта перехода по страницам с помощью пагинатора
let pagesNumber = 1


const parseNovotechShopRu= async(articulsToBeFound) => {
  let articuls = articulsToBeFound
  let imageDataArr = []
  let foundAll = false
  while (!foundAll && page <= pagesNumber) {
    let link = baseLink + page; // Конструктор ссылки на страницу со статьями для запроса по ней
    console.log("Запрос по ссылке: " + link); // Уведомление о получившейся ссылке
    // Запрос к странице сайта
    let response = await axios.get(link)
    var currentPage = response.data; // Запись полученного результата
    const dom = new JSDOM(currentPage); // Инициализация библиотеки jsdom для разбора полученных HTML-данных, как в браузере
    const document = dom.window.document; // Инициализация библиотеки jsdom для разбора полученных HTML-данных, как в браузере
    // Определение количества ссылок на странице, потому что оно у них не всегда фиксированное. Это значение понадобится в цикле ниже
    let linksLength = document.getElementsByClassName("s-blocks__item c-products")[0].getElementsByClassName('products__item').length;
    if (pagesNumber == 1) {
      let liTag = document.getElementsByClassName('pagin')[0].getElementsByTagName('li')
      let pagesNumberStr = liTag[liTag.length-2].getElementsByTagName('a')[0].innerHTML
      pagesNumber = parseInt(pagesNumberStr, 10)
    }
    // Перебор и запись всех статей на выбранной странице
    for (let i = 0; i < linksLength ; i++) {
      
      let articulOnPage = document.getElementsByClassName("s-blocks__item c-products")[0].getElementsByClassName('products__item')[i].getElementsByClassName("products__item-info-code")[0].getElementsByClassName("products__item-info-code-v")[0].innerHTML;
      if (articuls.includes(articulOnPage)) {
        // Получение относительных ссылок на статьи (так в оригинале)
        let relLink = document.getElementsByClassName("s-blocks__item c-products")[0].getElementsByClassName('products__item')[i].getElementsByTagName("a")[0].getAttribute("href");
        // Превращение ссылок в абсолютные
        let itemLink = relLink.replace("/", "https://novotech-shop.ru/");
        let responseInnerPage = await axios.get(itemLink)
        /* пути */
        let itemPage = responseInnerPage.data; // Запись полученного результата
        const domInnerPage = new JSDOM(itemPage); // Инициализация библиотеки jsdom для разбора полученных HTML-данных, как в браузере
        const documentInnerPage = domInnerPage.window.document;
        const slider = documentInnerPage
          .getElementsByClassName('product__wrap')[0]
          .getElementsByClassName('p-images')[0]
          .getElementsByClassName('p-images__container')[0]
          .getElementsByClassName('p-images__slider-cont')[0]
          .getElementsByClassName('p-images__slider owl-carousel owl-theme-nav-dots owl-theme-nav-2')[0]
          .getElementsByTagName('a')
        let imgUrlsForWP = []
        for (let i = 0; i<slider.length; i++) {
          let url
          if (!slider[i].getAttribute('class').includes('p-images__video')) {
            url = slider[i].getAttribute("href")
            imgUrlsForWP.push(url)//https://wp.magneticlight.ru/wp-content/uploads/${itemName.replace(/(\(|\)|,)/g, '')}${i+1}.jpg
          }
          //downloadImage(urlAbs, `./images/${itemName}(${i+1}).${url.slice(url.indexOf('.')+1)}`).then(console.log).catch(console.error)
        }
        imgUrlsForWP = imgUrlsForWP.sort().filter(function(item, pos, ary) {
          return !pos || item != ary[pos - 1];
        });
  
        let imageData
        let height,
            width,
            length

        const productContent = documentInnerPage.getElementsByTagName('main')[0].getElementsByClassName('product')[0].getElementsByClassName('s-blocks')[0].getElementsByClassName('s-blocks__item tab__name_features')[0]
        const productProperties = productContent.getElementsByClassName('p-features-table features')[0].getElementsByTagName('tbody')[0]
        const rows = productProperties.getElementsByTagName('tr')
        if (rows) {
          length = attributesGenerator('Длина (mm)', findAttributes(rows, 'Длина'))
          width = attributesGenerator('Ширина (mm)', findAttributes(rows, 'Ширина', 'Диаметр'))
          height = attributesGenerator('Высота (mm)', findAttributes(rows, 'Высота'))
        } else {
          length = attributesGenerator('Длина (mm)')
          width = attributesGenerator('Ширина (mm)')
          height = attributesGenerator('Высота (mm)')
        }
        imageData = imageDataGeneratorWithAttributes((articulOnPage).toString(), imgUrlsForWP,length, width, height)
        imageDataArr.push(imageData)

        articuls = articuls.filter((articul)=> {
          return articul != articulOnPage
        })
      }
    }
    page++; // Увеличение номера страницы для сбора данных, чтобы следующий запрос был на более старую страницу
    if (articuls.length == 0) {
      foundAll = true
    }
    await wait(2500)
    
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
/* const articulsToBeFound= ['135016', '357864', '135026', '370861']
parseNovotechShopRu(articulsToBeFound) */

module.exports = parseNovotechShopRu