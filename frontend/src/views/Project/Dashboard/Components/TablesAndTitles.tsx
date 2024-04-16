import { Accordion } from '@equinor/eds-core-react'
import { EvaluationsByProjectMaster } from '../../../../utils/hooks'
import EvaluationsTable from './EvaluationsTable'
import { useProject } from '../../../../globals/contexts'
import { useEffect } from 'react'
import EvaluationScoreIndicator from '../../../../components/EvaluationScoreIndicator'
import FollowUpIndicator from '../../../../components/FollowUpIndicator'
import { noProjectMasterTitle } from '../../../../utils/hooks'
import styled from 'styled-components'
import { ApolloQueryResult } from '@apollo/client'
import { Evaluation } from '../../../../api/models'

const Indicators = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 10px;
`

const StyledPanel = styled(Accordion.Panel)`
    overflow-y: auto;
`
interface Props {
    evaluationsWithProjectMasterTitle: EvaluationsByProjectMaster
    generatedBMTScores: any
    refetchActiveEvaluations: (() => Promise<ApolloQueryResult<{ evaluations: Evaluation[] }>>) | undefined
}

const TablesAndTitles = ({
    evaluationsWithProjectMasterTitle,
    generatedBMTScores,
    refetchActiveEvaluations,
}: Props) => {
    // console.log("TablesAndTitles.tsx: evaluationsWithProjectMasterTitle: ", evaluationsWithProjectMasterTitle)
    return (
        <>
            <Accordion headerLevel="h2">
                {Object.entries(evaluationsWithProjectMasterTitle).map(([projectMasterTitle, evaluations], index) => {
                    if (projectMasterTitle === noProjectMasterTitle) {
                        return null
                    }
                    let activityDate = ""
                    let projectId = ""
                    let followUpScore = null
                    Object.entries(evaluations).map((info) => {

                        if (info[1].projectId !== projectId) {
                            projectId = info[1].projectId
                        }

                        if (info[1].project.indicatorEvaluationId === info[1].id) {
                            if (info[1].indicatorActivityDate) {
                                activityDate = info[1].indicatorActivityDate
                            }
                        }
                    })
                    if (generatedBMTScores) {
                        generatedBMTScores.generateBMTScores.forEach((score: any, index: any) => {
                            if (score.projectId === projectId) {
                                followUpScore = score.followUpScore
                            }
                        })
                    }

                    return (
                        <Accordion.Item key={index}>
                            <Accordion.Header>
                                <Indicators>
                                    {projectMasterTitle}
                                    <FollowUpIndicator value={followUpScore} />
                                    <EvaluationScoreIndicator date={activityDate} />
                                </Indicators>
                            </Accordion.Header>
                            <StyledPanel>
                                <EvaluationsTable
                                    evaluations={evaluations}
                                    isInPortfolio={true}
                                    refetchActiveEvaluations={refetchActiveEvaluations}
                                />
                            </StyledPanel>
                        </Accordion.Item>
                    )
                })}
            </Accordion>
        </>
    )
}

export default TablesAndTitles
