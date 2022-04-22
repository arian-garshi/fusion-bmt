import { Context } from '@equinor/fusion'
import { Question, Progression, Role, Severity, Participant } from '../api/models'
import { SeverityCount } from './Severity'
import jwtDecode from 'jwt-decode'

interface Token {
    [key: string]: any
}

const CACHE_ENTRY = 'FUSION_AUTH_CACHE'

export const getCachedRoles = (): string[] => {
    const fusionStorageJson: string | null = localStorage.getItem(CACHE_ENTRY)
    if (fusionStorageJson === null) {
        return []
    }
    const fusionStorage = JSON.parse(fusionStorageJson)
    const token: string = fusionStorage[`${CACHE_ENTRY}:8829d4ca-93e8-499a-8ce1-bc0ef4840176:TOKEN`]
    const objectFromDecodedToken: Token = jwtDecode(token) as Token
    const roles: string[] = objectFromDecodedToken['roles']
    return roles
}

export const findCorrectAnswer = (
    question: Question,
    viewProgression: Progression,
    useFacilitatorAnswer: boolean,
    participant: Participant | undefined
) => {
    const answers = question.answers.filter(a => a.progression === viewProgression)

    if (useFacilitatorAnswer) {
        return answers.find(a => a.answeredBy?.role === Role.Facilitator)
    } else {
        if (!participant) {
            return undefined
        }
        return answers.find(a => a.answeredBy?.azureUniqueId === participant.azureUniqueId)
    }
}

export const useSharedFacilitatorAnswer = (progression: Progression) => {
    const correctProgression = !!(progression == Progression.Workshop || progression == Progression.FollowUp)

    return correctProgression
}

export const selectSeverity = (severityCount: SeverityCount) => {
    const PERCENTAGE_OF_ANSWERS_NEEDED_TO_INCREASE_SEVERITY = 10

    const totalSeverityCount = severityCount.nMajorIssues + severityCount.nSomeConcerns + severityCount.nOnTrack
    const percentageMajorIssues = totalSeverityCount > 0 ? (severityCount.nMajorIssues / totalSeverityCount) * 100 : 0
    const percentageSomeConcerns = totalSeverityCount > 0 ? (severityCount.nSomeConcerns / totalSeverityCount) * 100 : 0
    const percentageOnTrack = totalSeverityCount > 0 ? (severityCount.nOnTrack / totalSeverityCount) * 100 : 0

    const percentageMajorIssuesHighEnough = percentageMajorIssues > PERCENTAGE_OF_ANSWERS_NEEDED_TO_INCREASE_SEVERITY
    const percentageSomeConcernsHighEnough = percentageSomeConcerns > PERCENTAGE_OF_ANSWERS_NEEDED_TO_INCREASE_SEVERITY
    const percentageOnTrackHighEnough = percentageOnTrack > PERCENTAGE_OF_ANSWERS_NEEDED_TO_INCREASE_SEVERITY

    if (percentageMajorIssuesHighEnough) return Severity.MajorIssues
    if (!percentageMajorIssuesHighEnough && percentageSomeConcernsHighEnough) return Severity.SomeConcerns
    if (!percentageMajorIssuesHighEnough && !percentageSomeConcernsHighEnough && percentageOnTrackHighEnough) return Severity.OnTrack

    return Severity.Na
}

export const getFusionProjectName = (projects: Context[] | undefined, fusionProjectId: string) => {
    const fusionProject = projects?.find(project => project.id === fusionProjectId)
    return fusionProject?.title
}
