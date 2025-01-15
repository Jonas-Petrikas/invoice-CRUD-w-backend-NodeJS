const express = require('express');
const app = express();
const fs = require('fs');
const URL = 'http://localhost:3000/'
// const bodyParser = require('body-parser');
const handlebars = require('handlebars');

const apiUrl = "https://in3.dev/inv/";

let invoices = fs.readFileSync('./data/invoices.json', 'utf8');
invoices = JSON.parse(invoices);

const makeHTML = (data, pageName) => {

    data.url = URL;

    const topHtml = fs.readFileSync(`./templates/top.hbr`, 'utf8');     //paimt top
    const pageHtml = fs.readFileSync(`./templates/${pageName}.hbr`, 'utf8');     //paimt vidurį - pagal pageName
    const bottomHtml = fs.readFileSync(`./templates/bottom.hbr`, 'utf8');     //paimt bottom


    const html = handlebars.compile(topHtml + pageHtml + bottomHtml)(data);     //perduoti data ir suklijuoti

    return html;    //grąžinti suklijuotą html

}


function newInv(newData) {
    newData.subTotal = 0;
    newData.vat = 0;
    newData.grandTotal = 0;
    newData.totalDiscounts = 0;
    newData.items.map(item => {

        if (item.discount.type === 'fixed') {
            item.discount.Eur = item.discount.value;
            item.discount.P = item.discount.value * 100 / (item.price * item.quantity);

        } else if (item.discount.type === 'percentage') {
            item.discount.P = item.discount.value;
            item.discount.Eur = (item.price * item.quantity - (item.price * item.quantity * (1 - item.discount.P / 100)));
        } else {
            item.discount.Eur = 0;
            item.discount.P = 0;
        }



        item.itemTotal = item.quantity * item.price
        item.itemDiscountedTotal = (item.quantity * item.price - item.discount.Eur).toFixed(2);
        newData.subTotal += item.itemTotal;
        newData.totalDiscounts += item.discount.Eur;

        item.discount.Eur = `${item.discount.Eur.toFixed(2)}`;
        item.discount.P = `[-${item.discount.P.toFixed(2)}%]`


    })
    newData.vat = ((newData.subTotal + newData.shippingPrice) * 0.21);
    newData.grandTotal = newData.subTotal - newData.totalDiscounts + newData.shippingPrice + newData.vat;

    newData.subTotal = newData.subTotal.toFixed(2);
    newData.grandTotal = newData.grandTotal.toFixed(2)
    newData.totalDiscounts = newData.totalDiscounts.toFixed(2)
    newData.vat = newData.vat.toFixed(2)
    newData.shippingPrice = newData.shippingPrice.toFixed(2)


    fs.writeFileSync('./data/temp.json', JSON.stringify(newData), 'utf8');

}

// Function to add a new item
function addItem(newData) {
    // Read the current content of the file
    let fileContent = {};
    const oldData = fs.readFileSync('./data/invoices.json', 'utf8'); //nuskaito JSON
    fileContent = oldData ? JSON.parse(oldData) : {}; //Patikrina ar kažkas yra, jei ne įdeda '{}'

    if (!fileContent.items) {
        fileContent.items = [];
    }

    // Add the new item as a new array (if needed) or push it into an existing array
    fileContent.items.push(newData);

    // Write the updated content back to the file
    fs.writeFileSync('./data/invoices.json', JSON.stringify(fileContent), 'utf8');
    console.log('New item added successfully!');
    console.log(fileContent)
}


// Serve static files from the 'public' directory
app.use(express.static('public'));

app.get('/', (req, res) => {

    const data = {
        pageTitle: 'Pirmasis puslapis',
        URL
    };

    const html = makeHTML(data, 'landing');

    res.send(html);
});



app.get('/read/:number', (req, res) => {
    let invoices = fs.readFileSync('./data/invoices.json', 'utf8');
    invoices = JSON.parse(invoices);

    const invoice = invoices.items.find(invoice => invoice.number === req.params.number);



    const data = {
        pageTitle: `Sąskaitos ${{}} peržiūra'`,
        invoice,
        URL,
    };

    const html = makeHTML(data, 'read');

    res.send(html);
});

app.get('/list', (req, res) => {
    let invoices = fs.readFileSync('./data/invoices.json', 'utf8');
    invoices = JSON.parse(invoices);

    const data = {
        pageTitle: 'Sąskaitų sąrašas',
        invoices,
        URL,
    };

    const html = makeHTML(data, 'list');

    res.send(html);
});
app.get('/new', (req, res) => {
    // fetch(apiUrl)
    //     .then(res => res.json())
    //     .then(data => {
    //         newInv(data);
    //         res.redirect(`${URL}create`);
    //     });


    async function getData() {
        try {
            const response = await fetch(apiUrl);
            if (!response.ok) {
                throw new Error(`Response status: ${response.status}`);
            }

            const json = await response.json();
            newInv(json);
            console.log(json);
            res.redirect(`${URL}create`);

        } catch (error) {
            console.error('Error:', error);
        }
    }

    getData();
});

app.get('/create', (req, res) => {
    let invoice = fs.readFileSync('./data/temp.json', 'utf8');
    invoice = JSON.parse(invoice);

    const data = {
        pageTitle: 'Pridėti naują',
        invoice,
        URL,
    };

    const html = makeHTML(data, 'create');

    res.send(html);
});

app.get('/save', (req, res) => {
    let invoice = fs.readFileSync('./data/temp.json', 'utf8');
    invoice = JSON.parse(invoice);

    addItem(invoice);

    res.redirect(`${URL}list`);


});

// Start server

const port = 3000;
app.listen(port, () => {
    console.log(`Serveris pasiruošęs ir laukia ant ${port} porto!`);
});