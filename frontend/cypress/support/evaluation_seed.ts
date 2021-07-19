import { Progression, Question, Role } from '../../src/api/models'
import users from './users'
import { Answer, Action, Participant, Note, Summary } from './mocks'
import {
    GET_PROJECT,
    ADD_EVALUATION,
    PROGRESS_EVALUATION,
    SET_ANSWER,
    ADD_PARTICIPANT,
    CREATE_ACTION,
    CREATE_NOTE,
    SET_SUMMARY,
    PROGRESS_PARTICIPANT
} from './gql'


/** Setup an arbitrary Evaluation state - and feed it to the backend DB
 *
 * The motivation behind this class is to provide end-to-end tests with an
 * easy-to-use framework for setting up an initial evaluation state. Evaluation
 * state can be set up programmatically and then flushed to the backend
 * database using GraphQL requests.
 *
 * It work in two stages. First you set up the desired state. When you have a
 * Evaluation seed that captures what you want to test you can populate the
 * backend by calling .plant(). No network-requests are performed during setup.
 * This lets you set up presets outside of tests. And then each test that is
 * using the preset can simply use call .plant() to create its very own
 * Evaluation in the database.
 *
 * There are 2 ways main ways to use this class. It can be used in a before or
 * beforeEach to setup the initial evaluation state. Alternatively, it can be
 * used to create preset/default states that can be re-used in multiple tests.
 *
 *
 * Example usage
 * -------------
 *
 * Create an Evaluation at progression 'Individual' with 3 users
 *
 *      const seed = EvaluationSeed(Progression.Individual, 3)
 *
 * 'seed' now contains 3 participants, each backed by a mocked AD user. By
 * default the first user is a Role.Facilitator and will be used to create the
 * evaluation. All other users have Role.Participant and belong to
 * Organization.All. They are all at the same progression as the Evaluation.
 * These defaults can be changed:
 *
 *      const engineer = seed.participant[1]
 *      engineer.organization = Organization.Engineering
 *      engineer.Role = Role.Facilitator
 *      engineer.progression = Progression.Preparation
 *
 * Here we changed the second user to an engineer, upgraded it to a Facilitator
 * (this Evaluation now has 2 facilitators) and then our engineer is progressed
 * to Preparation.
 *
 * Next, we can let our engineer answer the first question in the questionnaire:
 *
 *      seed.addAnswer( new Answer({
 *          questionOrder: 1,
 *          answeredBy: engineer,
 *          text: "I have a nice answer to this question",
 *      }))
 *
 * By default the question will be set on the same progression as the
 * Participant is currently at. That's Progression.Preparation in this case.
 * But you can explicitly set a different progression when initializing the
 * Answer. The same is true for the Severity, which is defaulted to
 * Severity.Na.
 *
 * There is a couple of things to notice. First, Answer is a mock and not the
 * Answer type from models.ts. Next, we use the questionOrder to specify which
 * question to answer.  This is because we don't yet have question IDs (which
 * are generated by the backend). Also note that QuestionOrder is 1-indexed.
 *
 * Both Actions, Notes and evaluation summary can be added in a similar matter
 * as Answer.
 *
 * When you are done constructing an Evaluation state, it's time to plant your
 * seed:
 *
 *      seed.plant()
 *
 * This will create a new Evaluation in the backend DB and populate it for you.
 * You are now ready to write your test.
 *
 *
 * Warning
 * -------
 *
 * The responsibility for creating sensible Evaluation seeds are left to the
 * user of this class.  This class _does not_ sanitize the evaluation state
 * that's being set up. This means it's perfectly possible to create illogical
 * states. E.g. you can create an Action even though the Evaluation - and all the
 * participants,  are at progression.Individual. The rationale for this is that
 * implementing sanitizers will basically mean re-implementing the behaviour of
 * the application, which is error-prone and can easily get out-of-sync.
 */
export class EvaluationSeed {
    readonly name: string
    fusionProjectId: string
    projectId:    string = ''
    evaluationId: string = ''

    progression: Progression
    summary: Summary | undefined = undefined

    participants: Participant[] = []
    answers: Answer[] = []
    notes: Note[] = []
    actions: Action[] = []
    questions: Question[] = []


    constructor(
        progression: Progression,
        nParticipants: number,
        fusionProjectId: string = '123')
    {
        if (progression === undefined) {
            progression = Progression.Individual
        }

        if (nParticipants > users.length) {
            const msg = `You requested more mocked users (${nParticipants})
                than currently available (${users.length})`

            throw new RangeError(msg)
        }

        if (nParticipants < 1) {
            throw new RangeError('Need minimum one participant')
        }

        for (let i: number = 0; i < nParticipants; i++) {
            this.participants.push( new Participant({
                user: users[i],
                progression
            }))
        }

        /* The first user will always be a facilitator - and the 'creator' of
         * the Evaluation*/
        this.participants[0].role = Role.Facilitator

        this.progression = progression
        this.fusionProjectId = fusionProjectId
        this.name = 'Evaluation-' + Date.now()
    }

    addAnswer(answer: Answer) {
        this.answers.push(answer)
        return this
    }

    addAction(action: Action) {
        this.actions.push(action)
        return this
    }

    addNote(note: Note) {
        this.notes.push(note)
        return this
    }

    addSummary(summary: Summary) {
        this.summary = summary
        return this
    }

    findQuestionId(order: number) {
        const question = this.questions.find( x => x.order === order )
        if (question === undefined) {
            throw new RangeError('No such question')
        }
        return question.id
    }

    /** Plant the seed
     *
     * After setting up a valid seed (state) for an Evaluation, we need to feed
     * it to our database. plant() will do so by posting GraphQL mutations in
     * the following order:
     *
     *      login(...)
     *      CreateEvaluation(...)
     *      ProgressEvaluation(...)
     *
     *      for participant in this.participants:
     *          createParticipant(...)
     *          progressParticipant(...)
     *
     *      for answer in this.answers:
     *          login(...)
     *          setAnswer(...)
     *
     *      for action in this.actions:
     *          login(...)
     *          createAction(...)
     *
     *      for note in action.notes:
     *          login(...)
     *          createNote(...)
     *
     *      login(...)
     *      setSummary(...)
     *      login(...)
     *
     *
     *  Mutations for setting answers, actions, notes and evaluation summary
     *  don't explicitly include the creator of the element. In these cases
     *  the backend uses the JWT token to find the identity of the creator.
     *  This means that we have to login to the correct users before POSTing
     *  these mutations.
     *
     *  Note that multiple invocations of plant() will populate the database
     *  again.
     */
    plant() { return populateDB(this) }
}

const populateDB = (seed: EvaluationSeed) => {
    return cy.login(
        // Use first users to create eval. This user is auto added to
        // participants list.
        seed.participants[0].user
    ).then( () => {
        return cy.gql(
            GET_PROJECT,
            { variables: { fusionProjectId: seed.fusionProjectId } }
        )
    }
    ).then( (res) => {
        seed.projectId = res.body.data.project.id

        cy.log(`EvaluationSeed: Creating Evaluation`)
        return cy.gql(
            ADD_EVALUATION,
            { variables: { name: seed.name, projectId: seed.projectId } }
        ).then( (res) => {
            const evaluation = res.body.data.createEvaluation
            seed.evaluationId = evaluation.id
            seed.questions = evaluation.questions
            seed.participants[0].id = evaluation.participants[0].id
        })
    }
    ).then( () => {
        cy.log(`EvaluationSeed: Progressing Evaluation`)
        cy.gql(
            PROGRESS_EVALUATION,
            {
                variables: {
                    evaluationId: seed.evaluationId,
                    newProgression: seed.progression
                }
            }
        )
    }
    ).then( () => {
        cy.log(`EvaluationSeed: Progressing evaluation creator`)
        cy.gql(
            PROGRESS_PARTICIPANT,
            {
                variables: {
                    evaluationId: seed.evaluationId,
                    newProgression: seed.participants[0].progression
                }
            }
        )
    }
    ).then( () => { return seed.participants.slice(1) }
    ).each( (participant: Participant) => {
        cy.log(`EvaluationSeed: Adding and progressing additional Participants`)
        return cy.gql(
            ADD_PARTICIPANT,
            {
                variables: {
                    azureUniqueId: participant.user.id,
                    evaluationId: seed.evaluationId,
                    organization: participant.organization,
                    role: participant.role
                }
            }
        ).then( (res) => {
            participant.id = res.body.data.createParticipant.id
            cy.login(participant.user).then ( () => {
                cy.gql(
                    PROGRESS_PARTICIPANT,
                    {
                        variables: {
                            evaluationId: seed.evaluationId,
                            newProgression: participant.progression
                        }
                    }
                )
            })
        })
    }
    ).then( () => { return seed.answers }
    ).each( (answer: Answer) => {
        cy.login(
            answer.answeredBy.user
        ).then( () => {
            cy.log(`EvaluationSeed: Adding Answer`)
            cy.gql(
                SET_ANSWER,
                {
                    variables: {
                        questionId: seed.findQuestionId(answer.questionOrder),
                        severity: answer.severity,
                        text: answer.text,
                        progression: answer.progression
                    }

                }
            )
        })
    }
    ).then( () => { return seed.actions }
    ).each( (action: Action) => {
        cy.login(
            action.createdBy.user
        ).then( () => {
            cy.log(`EvaluationSeed: Adding Action`)
            cy.gql(
                CREATE_ACTION,
                {
                    variables: {
                        questionId: seed.findQuestionId(action.questionOrder),
                        assignedToId: action.assignedTo.id,
                        description: action.description,
                        dueDate: action.dueDate,
                        priority: action.priority,
                        title: action.title
                    }

                }
            )
        }
        ).then( (res) => {
            action.id = res.body.data.createAction.id
        })
    }
    ).then( () => { return seed.notes }
    ).each( (note: Note) => {
        cy.login(
            note.createdBy.user
        ).then( () => {
            cy.log(`EvaluationSeed: Adding Note`)
            cy.gql(
                CREATE_NOTE,
                {
                    variables: {
                        text: note.text,
                        actionId: note.action.id
                    }
                }
            )
        }) // TODO: save note Id if useful
    }
    ).then( () => {
        if (seed.summary !== undefined) {
            cy.login(
                seed.summary.createdBy.user
            ).then( () => {
                cy.log(`EvaluationSeed: Setting summary to: ${seed.summary!.summary}`)
                cy.gql(
                    SET_SUMMARY,
                    {
                        variables: {
                            evaluationId: seed.evaluationId,
                            summary: seed.summary!.summary
                        }
                    }
                )
            })
        }
    }
    ).then( () => { cy.login(seed.participants[0].user) })
}