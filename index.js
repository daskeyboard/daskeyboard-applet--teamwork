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
    var isBodyEmpty;
    let body;
    logger.info("Teamwork running.");

    // Check if the user add a specific configuration
    // In others words, check if every checkbox are false
    if(!(this.config["posts"]||this.config["tasks"]||this.config["milestones"]||this.config["comments"]||this.config["notebooks"])){

      // Default configuration.
      // Send message whenever all projects get an update

      logger.info("Default configuration. All updates from all projects.");

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
        logger.error("It has been an error in DEFAULT config: "+error);
        if(`${error.message}`.includes("getaddrinfo")){
          // Do not send signal
          // return q.Signal.error(
          //   'The Teamwork service returned an error. <b>Please check your internet connection</b>.'
          // );
        }else{
          return q.Signal.error([
            'The Teamwork service returned an error. <b>Please check your API key and account</b>.',
            `Detail: ${error.message}`
          ]);
        }
      };

    }else{

      // There is a needed configuration

      if(this.config["posts"]){

        logger.info("Posts configuration.");

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
                  // Created post
                  message.push(`New post: <b>${post.title}<b>, in ${post["project-name"]} project.`);
                }else{
                  logger.info("Updated post");
                  // Updated post
                  message.push(`Updated post: <b>${post.title}<b>, in ${post["project-name"]} project.`);
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
          logger.error("It has been an error in POST config: "+error);
          if(`${error.message}`.includes("getaddrinfo")){
            // Do not send signal
            // return q.Signal.error(
            //   'The Teamwork service returned an error. <b>Please check your internet connection</b>.'
            // );
          }else{
            return q.Signal.error([
              'The Teamwork service returned an error. <b>Please check your API key and account</b>.',
              `Detail: ${error.message}`
            ]);
          }
        };
      }

      if(this.config["tasks"]){

        logger.info("Tasks configuration");

        try{
          body = await request.get({
            url: `${this.baseUrl}/tasks.json`,
            headers: this.serviceHeaders,
            json: true
          });
          // Test if there is something inside the response
          isBodyEmpty = isEmpty(body["todo-items"]) || (body["todo-items"] === "[]");
          if (isBodyEmpty) {
            logger.error("Response empty when getting all tasks.");
          }
          else {

            // Extract the tasks from the response
            for (let task of body["todo-items"]) {
              // If there is an update on a task.
              if( task["last-changed-on"] > this.now ){

                // Update signal's message
                if( task["last-changed-on"] == task["created-on"] ){
                  logger.info("Created task");
                  // Created task
                  message.push(`New task: <b>${task.content}<b>, in ${task["todo-list-name"]} list, in ${task["project-name"]} project.`);
                }else{
                  logger.info("Updated task");
                  // Updated task
                  message.push(`Updated task: <b>${task.content}</b>, in ${task["todo-list-name"]} list, in ${task["project-name"]} project.`);
                }

                // Check if a signal is already set up
                // in order to change the url
                if(triggered){
                  url = `https://${this.subdomain}.teamwork.com/#/projects/list/active`;
                }else{
                  url = `https://${this.subdomain}.teamwork.com/#/tasks/${task.id}`;
                }

                // Need to send a signal
                triggered = true;
              }
            }
          }
        } catch(error){
          logger.error("It has been an error in TASKS config: "+error);
          if(`${error.message}`.includes("getaddrinfo")){
            // Do not send signal
            // return q.Signal.error(
            //   'The Teamwork service returned an error. <b>Please check your internet connection</b>.'
            // );
          }else{
            return q.Signal.error([
              'The Teamwork service returned an error. <b>Please check your API key and account</b>.',
              `Detail: ${error.message}`
            ]);
          }
        };
      }

      if(this.config["milestones"]){

        logger.info("Milestones configuration");

        try{
          body = await request.get({
            url: `${this.baseUrl}/milestones.json`,
            headers: this.serviceHeaders,
            json: true
          });
          // Test if there is something inside the response
          isBodyEmpty = isEmpty(body.milestones) || (body.milestones === "[]");
          if (isBodyEmpty) {
            logger.info("Response empty when getting all milestones.");
          }
          else {

            // Extract the milestones from the response
            for (let milestone of body.milestones) {
              // If there is an update on a milestone.
              if( milestone["last-changed-on"] > this.now ){

                // Update signal's message
                if( milestone["last-changed-on"] == milestone["created-on"] ){
                  logger.info("Created milestone");
                  // Created milestone
                  message.push(`New milestone: <b>${milestone.title}</b>, in ${milestone["project-name"]} project.`);
                }else{
                  logger.info("Updated milestone");
                  // Updated milestone
                  message.push(`Updated milestone: <b>${milestone.title}</b>, in ${milestone["project-name"]} project.`);
                }

                // Check if a signal is already set up
                // in order to change the url
                if(triggered){
                  url = `https://${this.subdomain}.teamwork.com/#/projects/list/active`;
                }else{
                  url = `https://${this.subdomain}.teamwork.com/#/milestones/${milestone.id}`;
                }

                // Need to send a signal
                triggered = true;
              }
            }
          }
        } catch(error){
          logger.error("It has been an error in MILESTONES config: "+error);
          if(`${error.message}`.includes("getaddrinfo")){
            // Do not send signal
            // return q.Signal.error(
            //   'The Teamwork service returned an error. <b>Please check your internet connection</b>.'
            // );
          }else{
            return q.Signal.error([
              'The Teamwork service returned an error. <b>Please check your API key and account</b>.',
              `Detail: ${error.message}`
            ]);
          }
        };
      }

      if(this.config["comments"]){

        logger.info("Comments configuration");

        try{
          body = await request.get({
            url: `${this.baseUrl}/comments.json`,
            headers: this.serviceHeaders,
            json: true
          });
          // Test if there is something inside the response
          isBodyEmpty = isEmpty(body.comments) || (body.comments === "[]");
          if (isBodyEmpty) {
            logger.info("Response empty when getting all comments.");
          }
          else {

            // Extract the comment from the response
            for (let comment of body.comments) {
              // If there is an update on a comment.
              if( comment["last-changed-on"] > this.now ){

                // Update signal's message
                if( comment["last-changed-on"] == comment.datetime ){
                  logger.info("Created comment");
                  // Created comment
                  message.push(`New comment in ${comment["project-name"]} project.`);
                }else{
                  logger.info("Updated comment");
                  // Updated milestone
                  message.push(`Updated comment in ${comment["project-name"]} project.`);
                }

                // Check if a signal is already set up
                // in order to change the url
                if(triggered){
                  url = `https://${this.subdomain}.teamwork.com/#/projects/list/active`;
                }else{
                  url = `https://${this.subdomain}.teamwork.com/#/${comment["comment-link"]}`;
                }

                // Need to send a signal
                triggered = true;
              }
            }
          }
        } catch(error){
          logger.error("It has been an error in COMMENTS config: "+error);
          if(`${error.message}`.includes("getaddrinfo")){
            // Do not send signal
            // return q.Signal.error(
            //   'The Teamwork service returned an error. <b>Please check your internet connection</b>.'
            // );
          }else{
            return q.Signal.error([
              'The Teamwork service returned an error. <b>Please check your API key and account</b>.',
              `Detail: ${error.message}`
            ]);
          }
        };
      }

      if(this.config["notebooks"]){

        logger.info("Notebooks configuration");

        try{
          body = await request.get({
            url: `${this.baseUrl}/notebooks.json`,
            headers: this.serviceHeaders,
            json: true
          });
          // Test if there is something inside the response
          isBodyEmpty = isEmpty(body.projects) || (body.projects === "[]");
          if (isBodyEmpty) {
            logger.info("Response empty when getting all notebooks.");
          }
          else {

            // Extract the project from the response
            for (let project of body.projects) {

              // Extract the notebooks from the project
              for (let notebook of project.notebooks) {

                // If there is an update on a notebook.
                if( notebook["updated-date"] > this.now ){

                  // Update signal's message
                  if( notebook["updated-date"] == notebook["created-date"] ){
                    logger.info("Created notebook");
                    // Created notebook
                    message.push(`New notebook: <b>${notebook.name}</b>, in ${project.name} project.`);
                  }else{
                    logger.info("Updated notebook");
                    // Updated notebook
                    message.push(`Updated notebook: <b>${notebook.name}</b>, in ${project.name} project.`);
                  }

                  // Check if a signal is already set up
                  // in order to change the url
                  if(triggered){
                    url = `https://${this.subdomain}.teamwork.com/#/projects/list/active`;
                  }else{
                    url = `https://${this.subdomain}.teamwork.com/#/notebooks/${notebook.id}`;
                  }

                  // Need to send a signal
                  triggered = true;
                }
              }
            }
          }
        } catch(error){
          logger.error("It has been an error in NOTEBOOKS config: "+error);
          if(`${error.message}`.includes("getaddrinfo")){
            // Do not send signal
            // return q.Signal.error(
            //   'The Teamwork service returned an error. <b>Please check your internet connection</b>.'
            // );
          }else{
            return q.Signal.error([
              'The Teamwork service returned an error. <b>Please check your API key and account</b>.',
              `Detail: ${error.message}`
            ]);
          }
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

  }

}

module.exports = {
  Teamwork: Teamwork,
};

const teamwork = new Teamwork();