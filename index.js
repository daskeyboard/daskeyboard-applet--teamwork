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
    // run every 20 sec
    this.pollingInterval = 20 * 1000;
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
    var isBodyEmpty;
    let body;
    logger.info("Teamwork running.");

    // Check if the user add a specific configuration
    // In others words, check if every checkbox are false
    if(!(this.config["posts"])){

      // Default configuration.
      // Send message whenever all projects get an update

      logger.info("Wanted default configuration. All projects updates.");
      
      try{
        body = await request.get({
          url: `${this.baseUrl}/projects.json`,
          headers: this.serviceHeaders,
          json: true
        });
        // Test if there is something inside the response
        isBodyEmpty = isEmpty(body.projects) || (body.projects === "[]");
        if (isBodyEmpty) {
          logger.info("Response empty when getting all projects.");
        }
        else {

          // Extract the issues from the response
          for (let project of body.projects) {

            // logger.info("This is a last changed on project:"+project["last-changed-on"]);
            // logger.info("This NOW:"+this.now);

            // If there is an update on a project.
            if( project["last-changed-on"] > this.now ){

              // Update signal's message
              if(project["last-changed-on"] == project["created-on"]){
                logger.info("Created project");
                // Created project
                message.push(`New project: ${project.name}.`);
              }else{
                logger.info("Updated project");
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
        }
      } catch(error){
        logger.info("There has been an error:"+error);
      };

    }else{

      // There is a needed configuration

      if(this.config["posts"]){

        logger.info("Wanted posts configuration");

        try{
          body = await request.get({
            url: `${this.baseUrl}/posts.json`,
            headers: this.serviceHeaders,
            json: true
          });
          // Test if there is something inside the response
          isBodyEmpty = isEmpty(body.posts) || (body.posts === "[]");
          if (isBodyEmpty) {
            logger.info("Response empty when getting all posts.");
          }
          else {

            // Extract the posts from the response
            for (let post of body.posts) {
              // If there is an update on a post.
              if( post["last-changed-on"] > this.now ){

                // Update signal's message
                if( post["last-changed-on"] == post["created-on"] ){
                  logger.info("Created post");
                  // Created project
                  message.push(`New post: ${post.title}.`);
                }else{
                  logger.info("Updated post");
                  // Updated project
                  message.push(`Update in ${post.title} post in ${post["project-name"]} project.`);
                }

                // Check if a signal is already set up
                // in order to change the url
                if(triggered){
                  url = `https://${this.subdomain}.teamwork.com/#/projects/list/active`;
                }else{
                  url = `https://${this.subdomain}.teamwork.com/#/messages/${post.id}`;
                }

                // Need to send a signal
                triggered = true;
              }
            }
          }
        } catch(error){
          logger.info("There has been an error:"+error);
        };

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

    // try {
      
    // }
    // catch (error) {
    //   logger.error(`Got error sending request to service: ${JSON.stringify(error)}`);
    //   return q.Signal.error([
    //     'The Teamwork service returned an error. Please check your API key and account.',
    //     `Detail: ${error.message}`
    //   ]);
    // }

  }

}

module.exports = {
  Teamwork: Teamwork,
};

const teamwork = new Teamwork();