export async function parseAuthLogout(request: Parse.Cloud.FunctionRequest) {
  const user = request.user!;
  const sessionQuery = new Parse.Query(Parse.Session);
  sessionQuery.equalTo("sessionToken", user.getSessionToken());
  const session = await sessionQuery.first({ sessionToken: user.getSessionToken() });
  if (!session) {
    throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, "Session not found");
  }
  if (session.get("user")?.id !== user.id) {
    throw new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, "Session not found");
  }
  await session.destroy({ useMasterKey: true });
}
