const imagemin = require('imagemin');
const imageminJpegtran = require('imagemin-jpegtran');
const imageminPngquant = require('imagemin-pngquant');
const fs = require("fs"); // Подключение встроенного в Node.js модуля fs для работы с файловой системой
const { zip } = require('zip-a-folder')
const path = require("path");


const downloadImage = async(url, filepath)=> {
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
exports.downloadImage = downloadImage

async function compressImages(){
    await imagemin(['images/*.{jpg,png}'], {
        destination: 'minified-images',
        plugins: [
            imageminJpegtran(),
            imageminPngquant({
                quality: [0.6, 0.8]
            })
        ]
    })
}

exports.compressImages = compressImages

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
exports.wait = wait

function jsonToCsv(items) {
    const header = Object.keys(items[0]);
    const headerString = header.join(',');
    // handle null or undefined values here
    const replacer = (key, value) => value ?? '';
    const rowItems = items.map((row) =>
      header
        .map((fieldName) => JSON.stringify(row[fieldName], replacer))
        .join(',')
    );
  
    // join header and body, and break into separate lines
    const csv = [headerString, ...rowItems].join('\r\n');
    return csv;
  }
exports.jsonToCsv = jsonToCsv

async function writeFiles(imageDataArr) {
    console.log('in write files')
    await wait(5000)

    console.log('creating csv')
    for (let i=0; i<imageDataArr.length; i+=5 ) {
        let csv = jsonToCsv(imageDataArr.slice(i,i+5))
        fs.writeFileSync(`./files/output${i}.csv`, csv, (err) => {
        if (err) throw err;
        });
    }
    try {
        await wait(5000)
        console.log('zipping')
        await zip('./files', './files.zip')
    } catch(e) {
        console.log(e)
    } 
    await wait(5000)
    fs.readdir('./files', (err, files) => {
        if (err) throw err;
        for (const file of files) {
        fs.unlink(path.join('./files', file), (err) => {
            if (err) throw err;
        });
        }
    });
}
exports.writeFiles = writeFiles

const attributesGenerator = (name, value='') => {
    return {
    [name]: value,
    };
};
exports.attributesGenerator = attributesGenerator


const imageDataGeneratorWithAttributes = (articul, images, ...attributes) => {
    const obj = attributes.reduce((acc, value) => {
        return { ...acc, ...value };
    });
    images = images.join(',')
    return {
        Артикул: articul,
        Изображения: images,
        ...obj,
    }
}
exports.imageDataGeneratorWithAttributes = imageDataGeneratorWithAttributes

const imageDataGenerator = (articul, images) => {
    images = images.join(',')
    return {
      Артикул: articul,
      Изображения: images
    }
}
exports.imageDataGenerator = imageDataGenerator