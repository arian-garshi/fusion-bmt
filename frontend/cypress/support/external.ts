import { User, users } from './users'
import { fusionProjects, getFusionProjectData, findFusionProjectByID } from './projects'

function findUserByID(id: string) {
    return users.filter(u => u.id == id)[0]
}

function findUserByUsername(username: string) {
    return users.filter(u => u.username == username)[0]
}

function getUserData(user: User) {
    // Fields are taken from various real requests
    return {
        positions: [],
        azureUniqueId: user.id,
        mail: user.email,
        name: user.name,
        jobTitle: user.jobTitle,
        department: 'Awesome department',
        fullDepartment: 'Completely awesome department',
        mobilePhone: '+12 34567890',
        officeLocation: 'Flower Garden',
        upn: user.username,
        preferredContactMail: null,
        isResourceOwner: false,
        accountType: user.type,
        company: null,
        roles: [],
        contracts: [],
        accountClassification: 'Internal',
        manager: null,
        managerAzureUniqueId: '000',
    }
}

Cypress.Commands.add('interceptExternal', () => {
    // TODO: do we want to intercept all the outgoing requests that currently result in errors
    cy.intercept('https://pro-s-portal-ci.azurewebsites.net/api/persons/me/settings/apps/bmt', {})
    cy.intercept('https://pro-s-portal-ci.azurewebsites.net/log/features', {})

    const projectURL = /https:\/\/pro-s-context-ci\.azurewebsites\.net\/contexts\/(.+)/
    cy.intercept(projectURL, req => {
        const fusionProjectId = req.url.match(projectURL)![1]
        const project = findFusionProjectByID(fusionProjectId)
        req.reply({
            body: getFusionProjectData(project),
        })
    })

    const projectsURL = /https:\/\/pro-s-context-ci\.azurewebsites\.net\/contexts$/
    cy.intercept(projectsURL, req => {
        req.reply({
            body: fusionProjects.map(p => {
                return getFusionProjectData(p)
            }),
        })
    })

    const personsURL = /https:\/\/pro-s-people-ci\.azurewebsites\.net\/persons\/(.+?)(?:(\?\$.*)|$)/
    cy.intercept(personsURL, req => {
        const id = req.url.match(personsURL)![1]
        const user = findUserByID(id)
        req.reply({
            body: getUserData(user),
        })
    })

    const personsPresenceURL = /https:\/\/pro-s-people-ci\.azurewebsites\.net\/persons\/(.+?)\/presence/
    cy.intercept(personsPresenceURL, req => {
        const id = req.url.match(personsPresenceURL)![1]
        req.reply({
            body: { id: id, availability: 'Available', activity: 'Available' },
        })
    })

    const searchPersonsURL = /https:\/\/pro-s-people-ci\.azurewebsites\.net\/persons\?\$search=(.+)/
    cy.intercept(searchPersonsURL, req => {
        const username = req.url.match(searchPersonsURL)![1]
        const user = findUserByUsername(username)
        req.reply({
            body: [getUserData(user)],
        })
    })
})

declare global {
    namespace Cypress {
        interface Chainable {
            /**
             * Intercept external to bmt calls to protected resources and return
             * dummy values
             * @example cy.interceptExternal()
             */
            interceptExternal(): void
        }
    }
}
