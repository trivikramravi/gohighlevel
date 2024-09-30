const express = require('express');
const axios = require('axios');
require('dotenv').config();
const customlogger = require('./logger');
const cron = require('node-cron');
const app = express();
const port = 5008;
const host = '0.0.0.0'


app.use(express.json());

app.get('/health', async (req, res) => {
  res.send("gohighlevel is running")
  })

app.post('/getUserFeed', async (req, res) => {
    const { startDate, endDate } = req.body;

  if (!startDate || !endDate) {
    return res.status(400).send('Please provide both startDate and endDate in the query parameters.');
  }
  let data = await dataExtacter(startDate,endDate)
  for(userData of data){
    if(userData.email != '' || userData.phone != ''){
    await createUser(userData)
    }else{
      customlogger.log(`the user cannot be created for data ${JSON.stringify(userData)}`)
    }
  }
  customlogger.log(`the extracted data is ${JSON.stringify(data)}`)
  res.json(data)
})

cron.schedule('0 4 * * *', async () => {
  //cron.schedule('*/5 * * * * *', async () => {
    customlogger.log("cron has started",new Date())
  const currentDate = new Date();
  currentDate.setDate(currentDate.getDate() - 1);
  
  const year = currentDate.getFullYear();
  const month = String(currentDate.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed, so add 1
  const day = String(currentDate.getDate()).padStart(2, '0');
  
  const formattedDate = `${year}-${month}-${day}`;
  customlogger.log(`the current date fetched for cron is ${formattedDate}`)
  
  let data = await dataExtacter(formattedDate,formattedDate)
    for(userData of data){
      if(userData.email != '' || userData.phone != ''){
      await createUser(userData)
      }else{
        customlogger.log(`the user cannot be created for data ${JSON.stringify(userData)}`)
      }
    }
  }, {
    scheduled: true,
  });

  app.listen(port,host, () => {
    customlogger.log(`Server is running on http://${host}:${port}`);
  });


async function dataExtacter(startDate,endDate){
const url = `https://guidebar-backend-727ab3a68ba9.herokuapp.com/get_people_feed/pizzabox_ai/${startDate}T00:00:00.813+05:30/${endDate}T23:59:59.813+05:30`;
let userDetails = []

let response = await axios.get(url)
    .then(response => {
        //customlogger.log('Data:', response.data[0]);
        for (let d of response.data) {
            let userData = {}
            let fullData = JSON.parse(d.full_data)
            //customlogger.log(fullData)
            userData.email = fullData.PERSONAL_EMAIL == null ? '' : fullData.PERSONAL_EMAIL
            userData.phone = fullData.MOBILE_PHONE == null ? '' : fullData.MOBILE_PHONE.toString();
            userData.first_name = fullData.FIRST_NAME == null ? '': fullData.FIRST_NAME
            userData.last_name = fullData.LAST_NAME == null ? '': fullData.LAST_NAME
            userData.name = ''
            //userData.email = fullData.BUSINESS_EMAIL
            userData.dateOfBirth = ''
            userData.address1 = ''
            userData.city = fullData.PERSONAL_CITY == null ? '': fullData.PERSONAL_CITY
            userData.state = fullData.PERSONAL_STATE == null ? '': fullData.PERSONAL_STATE
            userData.country = ''
            userData.postalCode = fullData.PERSONAL_ZIP == null ? '': fullData.PERSONAL_ZIP
            userData.companyName = ''
            userData.website = fullData.REF_URL == null ? '': fullData.REF_URL
            userData.tags = []
            userData.source = "public api"
            let customField = {}
            customField.booking_confirm = "no"
            userData.customField = customField
            //userData.booking_confirm ="no"
            if (d.company_data != null && d.company_data != undefined) {
            let companyData = JSON.parse(d.company_data)
            if(companyData.company != null && companyData.company != undefined){
            userData.companyName = companyData.company.legalName == null ? '': companyData.company.legalName
            userData.tags = companyData.company.tags
            //customlogger.log(companyData.geoIP)
            }
            }
            // if (d.page_history != null && d.page_history != undefined) {
            //     let pageHistory = JSON.parse(d.page_history)
            //     for (let pg of pageHistory) {
            //         customlogger.log(pg.startTime)
            //         break;
            //     }
            // }
            if (d.apollo_data != null && d.apollo_data != undefined) {
                let apolloData = JSON.parse(d.apollo_data)
                //customlogger.log(apolloData.first_name)
                userData.name = apolloData.name
                userData.country = apolloData.country
                if(userData.first_name == ''){
                  userData.first_name = apolloData.first_name == null ? '' : apolloData.first_name 
                }
                if(userData.last_name == ''){
                  userData.last_name = apolloData.last_name == null ? '' : apolloData.last_name
                }
                if(userData.email == ''){
                  userData.email = apolloData.email == null ? '' : apolloData.email 
                }
            }
            //customlogger.log("the userData is", JSON.stringify(userData))
            if(userData.country == "" || userData.country == null || userData.country == undefined){
              userData.country = null
            }

            userDetails.push(userData)
            //break;
        }
        //customlogger.log("the userData is", JSON.stringify(userDetails))

        return userDetails
    })
    .catch(error => {
        customlogger.log(`Error fetching data ${error}`);
        return {error:error.message}
    })
    return response

}

async function createUser(userdata){
    axios.post(process.env.GOHIGHLEVEL_URL, userdata, {
        headers: {
          'Authorization': 'Bearer '+ process.env.GOHIGHLEVEL_TOKEN,
          'Content-Type': 'application/json'
        }
      })
      .then(response => {
        customlogger.log(`the gohighlevel Response ${JSON.stringify(response.data)}`);
      })
      .catch(error => {
        if (error.response) {
          // Server responded with a status code that falls out of the range of 2xx
          customlogger.log(`GoHighLevel Error: ${JSON.stringify(error.response.data)} , error status code ${error.response.status} for userData ${JSON.stringify(userdata)}`);
        } else if (error.request) {
          // Request was made but no response received
          customlogger.log(`No response received from GoHighLevel for userData ${JSON.stringify(userdata)}`);
          customlogger.log(`Request: ${error.request}`);
        } else {
          // Something happened in setting up the request
          customlogger.log(`the gohighlevel error ${error} for userData ${JSON.stringify(userdata)}`);
        }
      });
}