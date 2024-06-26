import { PersonAvatar, PersonDetails } from '@equinor/fusion-react-person'
import { Box, Typography } from '@mui/material'
import React, { useEffect, useState } from 'react'
import { Participant } from '../api/models'
import { usePeopleApi } from '../api/usePeopleApi'

interface ParticipantCardProps {
    participant: Participant
}

const ParticipantCard = ({ participant }: ParticipantCardProps) => {

    const apiClients = usePeopleApi()

    const [isFetchingPerson, setIsFetchingPerson] = useState<boolean>(true)
    const [personDetails, setPersonDetails] = useState<PersonDetails>()

    const apiResponseToPersonDetails = (response: any): PersonDetails => {
        return {
            azureId: response.azureUniqueId,
            name: response.name,
            jobTitle: response.jobTitle,
            department: response.department,
            mail: response.mail,
            upn: response.upn,
            mobilePhone: response.mobilePhone,
            accountType: response.accountType,
            officeLocation: response.officeLocation,
            managerAzureUniqueId: response.managerAzureUniqueId,
        }

    }

    useEffect(() => {
        let isMounted = true

        apiClients.getById(participant.azureUniqueId).then(response => {

            const personDetails = apiResponseToPersonDetails(response)
            if (isMounted) {
                setPersonDetails(personDetails)
                setIsFetchingPerson(false)
            }
        })

        return () => {
            isMounted = false
        }
    }, [])

    return (
        <Box
            p="14px"
            display='flex'
            alignItems='center'
            justifyContent='flex-start'
            flexDirection='row'
            gap='10px'
        >
            <PersonAvatar azureId={personDetails?.azureId} />
            <Box display='flex' flexDirection='column'>
                <Typography variant="body1">{personDetails?.name}</Typography>
                <a
                    href={`mailto:${personDetails?.mail}`}
                    style={{ color: 'rgba(0, 112, 121, 1)' }}
                >{personDetails?.mail}
                </a>
            </Box>
        </Box>
    )
}

export default ParticipantCard
