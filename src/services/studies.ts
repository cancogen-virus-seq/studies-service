import {
  AddSubmittersReq,
  CreateStudyReq,
  RemoveSubmitterReq,
  SongStudy,
  Study,
  EgoStudyGroup,
} from '../common/types';
import {
  FailedToRemoveSubmitterFromStudy as FailedToRemoveSubmitterFromStudyGroup,
  FailedToCreateStudyInEgo,
  FailedToCreateStudyInSong,
  StudyNotFound,
  SubmitterNotFound,
  FailedToAddSubmittersToStudy as FailedToAddSubmittersToStudyGroup,
} from '../common/errors';
import { createSongStudy, getSongStudies } from './song';
import {
  getEgpStudyGroups,
  getEgoStudyUsers,
  getEgoStudyGroup,
  getEgoUser,
  removeUserFromGroup,
  addUsersToGroup,
  createEgoStudyGroup,
  createEgoStudyPolicy,
  addGroupToPolicy,
} from './ego';

export const getStudies = async (): Promise<Study[]> => {
  const { studyIds, studyDetails } = await getSongStudies();
  const studyGroups: EgoStudyGroup[] = await getEgpStudyGroups(studyIds);
  const studyUsers: Record<string, string[]> = await getEgoStudyUsers(studyGroups);

  return (
    studyDetails
      // studyUsers can be empty array but should not undefined
      .filter((sd) => studyUsers[sd.studyId] !== undefined)
      .map((sd: SongStudy) => {
        return {
          studyId: sd.studyId,
          studyName: sd.name,
          description: sd.description,
          organization: sd.organization,
          emailAddresses: studyUsers[sd.studyId],
        };
      })
  );
};

export const createStudy = async (req: CreateStudyReq): Promise<Study | undefined> => {
  const createdSongStudy = await createSongStudy(req);
  if (!createdSongStudy) {
    throw FailedToCreateStudyInSong(req.studyId);
  }

  const groupId = await createEgoStudyGroup(req.studyId, req.description);
  if (!groupId) {
    throw FailedToCreateStudyInEgo(req.studyId);
  }

  const policyId = await createEgoStudyPolicy(req.studyId);
  if (!policyId) {
    throw FailedToCreateStudyInEgo(req.studyId);
  }

  const added = await addGroupToPolicy(groupId, policyId);
  if (!added) {
    throw FailedToCreateStudyInEgo(req.studyId);
  }

  return {
    ...req,
    emailAddresses: [],
  };
};

export const addSubmittersToStudy = async (req: AddSubmittersReq) => {
  const egoGroup = await getEgoStudyGroup(req.studyId);
  if (!egoGroup) {
    throw StudyNotFound([req.studyId]);
  }

  const userIds = [];
  const missingUsers = [];
  for (const email of req.emailAddresses) {
    const egoUser = await getEgoUser(email);
    if (!egoUser) {
      missingUsers.push(email);
    } else {
      userIds.push(egoUser?.id);
    }
  }
  if (missingUsers.length > 0) {
    throw SubmitterNotFound(missingUsers);
  }

  const successfullyAdded = await addUsersToGroup(egoGroup.id, userIds);
  if (!successfullyAdded) {
    throw FailedToAddSubmittersToStudyGroup(req.studyId, req.emailAddresses);
  }

  return req;
};

export const removeSubmitterFromStudy = async (req: RemoveSubmitterReq) => {
  const egoUser = await getEgoUser(req.email);
  if (!egoUser) {
    throw SubmitterNotFound([req.email]);
  }

  const egoGroup = await getEgoStudyGroup(req.studyId);
  if (!egoGroup) {
    throw StudyNotFound([req.studyId]);
  }

  const successfullyRemoved = await removeUserFromGroup(egoGroup.id, egoUser.id);
  if (!successfullyRemoved) {
    throw FailedToRemoveSubmitterFromStudyGroup(req.studyId, req.email);
  }

  return req;
};