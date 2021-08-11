import React from 'react'

import { RouteComponentProps } from 'react-router-dom'
import { TextArea } from '@equinor/fusion-components'
import { Tabs } from '@equinor/eds-core-react'
import { ApolloError, gql, useQuery } from '@apollo/client'
import { useCurrentUser } from '@equinor/fusion'

import ProjectDashboardView from './Dashboard/ProjectDashboardView'
import { Project } from '../../api/models'
import { ProjectContext } from '../../globals/contexts'
import { StyledTabPanel } from '../../components/StyledTabs'
import ActionTableForOneUserWithApi from '../../components/ActionTable/ActionTableForOneUserWithApi'

const { TabList, Tab, TabPanels } = Tabs

interface ProjectQueryProps {
    loading: boolean
    project: Project | undefined
    error: ApolloError | undefined
}

const useProjectQuery = (fusionProjectId: string): ProjectQueryProps => {
    const GET_PROJECT = gql`
        query {
            project(fusionProjectID: "${fusionProjectId}") {
                id
                fusionProjectId
                createDate
            }
        }
    `

    const { loading, data, error } = useQuery<{ project: Project }>(GET_PROJECT)

    return {
        loading,
        project: data?.project,
        error,
    }
}

interface Params {
    fusionProjectId: string
}

const ProjectRoute = ({ match }: RouteComponentProps<Params>) => {
    const currentUser = useCurrentUser()
    const fusionProjectId = match.params.fusionProjectId

    const [activeTab, setActiveTab] = React.useState(0)
    const { loading, project, error } = useProjectQuery(fusionProjectId)

    if (loading) {
        return <>Loading...</>
    }

    if (error !== undefined || project === undefined) {
        return (
            <div>
                <TextArea value={JSON.stringify(error)} disabled={false} onChange={() => {}} />
            </div>
        )
    }

    return (
        <ProjectContext.Provider value={project}>
            <Tabs activeTab={activeTab} onChange={setActiveTab}>
                <TabList>
                    <Tab>Dashboard</Tab>
                    <Tab>Actions</Tab>
                </TabList>
                <TabPanels>
                    <StyledTabPanel>
                        <ProjectDashboardView project={project} />
                    </StyledTabPanel><StyledTabPanel>
                        <ActionTableForOneUserWithApi azureUniqueId={currentUser!.id}/>
                    </StyledTabPanel>
                </TabPanels>
            </Tabs>
        </ProjectContext.Provider>
    )
}

export default ProjectRoute
