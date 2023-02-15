const axios = require("axios"); // Подключение модуля axios для скачивания страницы
const jsdom = require("jsdom"); // Подключение модуля jsdom для работы с DOM-деревом (1)
const { JSDOM } = jsdom; // Подключение модуля jsdom для работы с DOM-деревом (2)
const { attributesGenerator, wait, writeFiles, imageDataGeneratorWithAttributes } = require("./functions");

/* выполнняет поиск по рядам таблицы */
function findAttributes(productProperties, attributeName, orAttributeName = ''){
  let propertiesLength = productProperties.length
  for (let i = 0; i < propertiesLength; i++) {
      let condition = productProperties[i].getElementsByTagName('span')[0].innerHTML
      condition = condition.toLowerCase()
      attrName = attributeName.toLowerCase()
      orAttrName = orAttributeName.toLowerCase()
      
      if (condition.includes(attrName) || (orAttrName && condition.includes(orAttrName))) {
          let atrValue = productProperties[i].getElementsByTagName('span')[1].innerHTML
          atrValue = atrValue.replace(/&nbsp;/g, '');
          return Number(atrValue.replace(',', '.').match(/(?<=^| )\d+(\.\d+)?(?=$| )/)[0])
      }
  }
}

const parseSeries = async (documentProd, articuls) => {
  let imageArr = []
  let filteredArticuls = articuls
  //серии
  let products = documentProd.getElementsByClassName('inner')[0].getElementsByClassName('catalog-list tile')
    if (products.length) {
      products = products[0].getElementsByClassName('sprod-card')
      for (let productPage of products) {
        let articulOnPage = productPage.getElementsByClassName('article')[0].innerHTML
        console.log('articulOnPage', articulOnPage)
        if (articuls.includes(articulOnPage)) {    
          let linkProdRel = productPage.getElementsByClassName('product-image')[0].getAttribute('href')
          let linkProd = linkProdRel.replace("/", "https://donolux.ru/");
          console.log("Запрос по ссылке linkProd2: " + linkProd)
          let responseProd = await axios.get(linkProd/* , {headers: {'User-Agent': 'whatever'}} */)
          var pageProd = responseProd.data; // Запись полученного результата
          const domProd = new JSDOM(pageProd); // Инициализация библиотеки jsdom для разбора полученных HTML-данных, как в браузере
          const documentProd = domProd.window.document;
          let slider = documentProd.getElementsByClassName('full-product')[0].getElementsByClassName('fp-images')[0].getElementsByClassName('fp-images-list')[0].getElementsByTagName('a')
          let imgUrlsForWP =[]
          for (let i = 0; i< slider.length; i++) {
            let urlRel = slider[i].getAttribute("href")
            let url = urlRel.replace("/", "https://donolux.ru/");
            imgUrlsForWP.push(url)//https://wp.magneticlight.ru/wp-content/uploads/${itemName.replace(/(\(|\)|,)/g, '')}${i+1}.jpg
          }
          imgUrlsForWP = imgUrlsForWP.sort().filter(function(item, pos, ary) {
            return !pos || item != ary[pos - 1];
          });
    
          let imageData
          let height,
              width,
              length
          let productContent = documentProd.getElementsByClassName('full-product')[0].getElementsByClassName('fp-info')[0].getElementsByClassName('fpi-block')
          let productProperties
          
          for (let i = 0; i < productContent.length; i++ ) {
            if (productContent[i].getElementsByClassName('more-info-toggle')[0]?.getElementsByTagName('h3')[0]?.innerHTML.includes('Характеристики')) {
              productProperties = productContent[i].getElementsByClassName('mit-hidden')[0]
            }
          }
          
          const rows = productProperties.getElementsByClassName('char-item p5')
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
          imageArr.push(imageData)
  
          filteredArticuls = filteredArticuls.filter((articul)=> {
            return articul != articulOnPage
          }) 
          if (filteredArticuls.length == 0) {
            console.log('breakSeries')
            break
          }
          await wait(2000)
          
        }
        
      }
    }
  return {imageArr, filteredArticuls}
}
const parseCategories = async(document, imageDataArr, foundAll, articuls) => {
  let articulsCats = articuls
  let imageDataArrCats = imageDataArr
  let foundAllCats = foundAll
  let subcaterories = document.getElementsByClassName('inner')[0].getElementsByClassName('prod-sub-parts')
  if (subcaterories.length) {
    let subcategoriesArray = subcaterories[0].getElementsByTagName('a')
    for (let subcategory of subcategoriesArray) {
      let subcategoryLinkRel = subcategory.getAttribute('href')
      let subcategoryLink = subcategoryLinkRel.replace("/", "https://donolux.ru/");
      if (subcategoryLink !== 'https://donolux.ru/upload/Magnetic_2020.pdf') {
        console.log("Запрос по ссылке subcategoryLink: " + subcategoryLink)
  
        let responseSubcategory = await axios.get(subcategoryLink)
        var responseSubcategoryPage = responseSubcategory.data; // Запись полученного результата
        const domSubcategoryPage = new JSDOM(responseSubcategoryPage); // Инициализация библиотеки jsdom для разбора полученных HTML-данных, как в браузере
        const documentSubcategoryPage = domSubcategoryPage.window.document;
  
        let result = await parseCategories(documentSubcategoryPage, imageDataArrCats, foundAllCats, articulsCats)
        imageDataArrCats = result.imageDataArrCats

        articulsCats = result.articulsCats
        foundAllCats = result.foundAllCats
        if (foundAllCats) {
          console.log('breakCategories')
          break
        }
        await wait(1000)
      }
    }
    await wait(2000)
  } else {
    let {imageArr, filteredArticuls} = await parseSeries(document, articulsCats)
    if (imageArr.length) {
      imageDataArrCats = imageDataArrCats.concat(imageArr)
      console.log('filteredArticuls тут', filteredArticuls, filteredArticuls.length)
      articulsCats = filteredArticuls
      if (articulsCats.length == 0) {
        console.log('foundAll')
        foundAllCats = true
      }
    }
  }

  return {imageDataArrCats, articulsCats, foundAllCats}
}

const parseDonoluxRu= async(articulsToBeFound, baseLink) => {
  let articuls = articulsToBeFound
  let imageDataArr = []
  let foundAll = false
  console.log("Запрос по ссылке baseLink: " + baseLink)
  let response = await axios.get(baseLink/* , {headers: {'User-Agent': 'whatever'}} */)
  var currentPage = response.data; // Запись полученного результата
  const dom = new JSDOM(currentPage); // Инициализация библиотеки jsdom для разбора полученных HTML-данных, как в браузере
  const document = dom.window.document;
  if (baseLink !== 'https://donolux.ru/produktsiya') {
    let result = await parseCategories(document, imageDataArr, foundAll, articuls)
  
    imageDataArr = result.imageDataArrCats
    articuls = result.articulsCats
  } else {
    const list = document.getElementsByClassName('inner')[0].getElementsByClassName('project-types fs')[0].getElementsByTagName('a')
    for (let listItem of list) {
      const linkRel = listItem.getAttribute('href')
      let link = linkRel.replace("/", "https://donolux.ru/");
      console.log("Запрос по ссылке link: " + link)
      let responseSubcategory = await axios.get(link)
      const responseSubcategoryPage = responseSubcategory.data; // Запись полученного результата
      const domSubcategoryPage = new JSDOM(responseSubcategoryPage); // Инициализация библиотеки jsdom для разбора полученных HTML-данных, как в браузере
      const documentSubcategoryPage = domSubcategoryPage.window.document;
      let result = await parseCategories(documentSubcategoryPage, imageDataArr, foundAll, articuls)
      imageDataArr = result.imageDataArrCats
      articuls = result.articulsCats
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
/* const articulsToBeFound= ['DL20239M38W1 Black Bronze']

parseDonoluxRu(articulsToBeFound) */

module.exports = parseDonoluxRu