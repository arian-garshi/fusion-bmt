import { EvaluationSeed } from '../support/evaluation_seed'
import { Progression } from '../../src/api/models'
import { Action } from '../support/mocks'
import ActionsGrid from '../support/action_grid'
import { ConfirmationDialog } from '../support/common'
import { EvaluationPage } from '../support/evaluation'
import { DELETE_ACTION } from '../support/gql'
import * as faker from 'faker'

describe('Actions', () => {
    const evaluationPage = new EvaluationPage()
    context('Delete', () => {
        let seed: EvaluationSeed
        let actionToDelete: Action
        let actionToStay: Action

        const deleteActionFrom = faker.random.arrayElement([Progression.Workshop, Progression.FollowUp])

        beforeEach(() => {
            ;({ seed, actionToDelete, actionToStay } = createDeleteSeed())

            seed.plant().then(() => {
                const user = faker.random.arrayElement(seed.participants).user
                cy.visitEvaluation(seed.evaluationId, user)
                evaluationPage.progressionStepLink(deleteActionFrom).click()
                cy.contains(actionToDelete.title).should('exist')
                cy.contains(actionToStay.title).should('exist')
            })
        })

        const deleteAction = () => {
            const actionsGrid = new ActionsGrid()
            actionsGrid.deleteActionButton(actionToDelete.id).click()

            const confirmationDialog = new ConfirmationDialog()
            confirmationDialog.yesButton().click()
        }

        it('Action can be deleted', () => {
            deleteAction()
            cy.testCacheAndDB(() => {
                evaluationPage.progressionStepLink(deleteActionFrom).click()
                cy.contains(actionToDelete.title).should('not.exist')
                cy.contains(actionToStay.title).should('exist')
            })
        })

        it('Action delete may be canceled', () => {
            new ActionsGrid().deleteActionButton(actionToDelete.id).click()
            new ConfirmationDialog().noButton().click()

            cy.testCacheAndDB(() => {
                evaluationPage.progressionStepLink(deleteActionFrom).click()
                cy.contains(actionToDelete.title).should('exist')
                cy.contains(actionToStay.title).should('exist')
            })
        })

        it('Deleted action can not be deleted again', () => {
            cy.gql(DELETE_ACTION, {
                variables: {
                    actionId: actionToDelete.id,
                },
            }).then(() => {
                cy.on('uncaught:exception', (err, runnable) => {
                    if (err.message.includes('Action not found')) {
                        console.log("Swallowing unhandled 'Action not found'")
                        return false
                    }
                })

                deleteAction()

                cy.testCacheAndDB(
                    () => {
                        cy.contains(actionToStay.title).should('exist')
                        cy.contains('Action not found').should('exist')
                    },
                    () => {
                        evaluationPage.progressionStepLink(deleteActionFrom).click()
                        cy.contains(actionToDelete.title).should('not.exist')
                        cy.contains(actionToStay.title).should('exist')
                        cy.contains('Action not found').should('not.exist')
                    }
                )
            })
        })
    })
})

const createDeleteSeed = () => {
    const seed = new EvaluationSeed({
        progression: faker.random.arrayElement(Object.values(Progression)),
        nParticipants: faker.datatype.number({ min: 1, max: 5 }),
    })

    const actionToDelete = seed.createAction({
        title: 'You shall be murdered! 😇',
        description: 'Naughty, naughty action!',
    })
    const actionToStay = seed.createAction({
        title: 'You have my permission to live 😈',
    })
    const otherActions: Action[] = Array.from({ length: faker.datatype.number({ min: 0, max: 5 }) }, () => {
        return seed.createAction({})
    })
    faker.helpers.shuffle([actionToDelete, actionToStay, ...otherActions]).forEach(a => seed.addAction(a))

    return { seed, actionToDelete, actionToStay }
}
