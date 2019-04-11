// Library to send signal to Q keyboards
const q = require('daskeyboard-applet');
// Library to send request to API
const request = require('request-promise');
// Library to format the date
var dateFormat = require('dateformat');
// Library to convert to Base64
const btoa = require('btoa');

const logger = q.logger;

const baseUrl1 = 'https://';
const baseUrl2 = '.teamwork.com'

// Get the current time
function getUtcTime() {
  var now = new Date();
  var utcTime = dateFormat(now, "isoUtcDateTime");
  return utcTime;
}

// Test if an object is empty
function isEmpty(obj) {
  for(var key in obj) {
      if(obj.hasOwnProperty(key))
          return false;
  }
  return true;
}

class Teamwork extends q.DesktopApp {

  constructor() {
    super();
    // run every 30 sec
    this.pollingInterval = 30 * 1000;
  }

  async applyConfig() {

    logger.info("Teamwork initialisation.")

    this.subdomain = this.config.subdomain;
    
    // Create and initialize time variable
    this.now = getUtcTime();

    this.baseUrl = baseUrl1 + this.subdomain + baseUrl2;
    this.params = `${this.authorization.apiKey}:xxx`;
    this.paramsBase64Encoded = btoa(this.params);
  
    this.serviceHeaders = {
      "Authorization": `Basic ${this.paramsBase64Encoded}`,
      "Content-Type": "application/json"
    }
  }

  // call this function every pollingInterval
  async run() {
    let signal = null;
    let triggered = false;
    let message = [];
    let url;

    logger.info("Teamwork running.");

    try {
      const body = await request.get({
        url: `${this.baseUrl}/projects.json`,
        headers: this.serviceHeaders,
        json: true
      });

      // Test if there is something inside the response
      var isBodyEmpty = isEmpty(body) || (body === "[]");
      if (isBodyEmpty) {
        logger.info("Response empty when getting all issues.");
      }
      else {

        logger.info("This is how the projects look: " + JSON.stringify(body) );

        // Extract the issues from the response
        for (let project of body.projects) {
          // If there is an update on a project.
          if( (project.last-change-on > this.now) ){

            // Update signal's message
            if(project.last-changed-on==project.created-on){
              logger.info("CREATED PROJECT");
              // Created project
              message.push(`New project: ${project.name}.`);
            }else{
              logger.info("UPDATED PROJECT");
              // Updated project
              message.push(`Update in ${project.name} project.`);
            }

            // Check if a signal is already set up
            // in order to change the url
            if(triggered){
              url = `https://${this.subdomain}.teamwork.com/#/projects/list/active`;
            }else{
              url = `https://${this.subdomain}.teamwork.com/#/projects/${project.id}/overview/summary`;
            }

            // Need to send a signal
            triggered = true;
          }
        }

        // If we need to send a signal with one or several updates.
        if(triggered){

          // Updated time
          this.now = getUtcTime();

          // Create signal
          signal = new q.Signal({
            points: [[new q.Point(this.config.color, this.config.effect)]],
            name: "Teamwork",
            message: message.join("<br>"),
            link: {
              url: url,
              label: 'Show in Teamwork',
            }
          });

        }

        return signal;
      }
    }
    catch (error) {
      logger.error(`Got error sending request to service: ${JSON.stringify(error)}`);
      return q.Signal.error([
        'The Teamwork service returned an error. Please check your API key and account.',
        `Detail: ${error.message}`
      ]);
    }

  }

}

module.exports = {
  Teamwork: Teamwork,
};

const teamwork = new Teamwork();