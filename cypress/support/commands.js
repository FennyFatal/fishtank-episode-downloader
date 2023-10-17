// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })

Cypress.Commands.add("print", (...message) => cy.task("print", message));
Cypress.Commands.add('downloadFile', function (url, dir, fileName, userAgent) {
    return cy.getCookies().then(function (cookies) {
      return cy.task('downloadFile', {
        url: url,
        directory: dir,
        cookies: cookies,
        fileName: fileName,
        userAgent: userAgent
      }, {timeout: 3600000});
    });
  });
