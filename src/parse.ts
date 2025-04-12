import Parse from "parse/node";

export interface ParseConfig {
  url: string;
  applicationId: string;
}

export const parseConfig: ParseConfig = {
  url: process.env.PARSE_SERVER_URL!,
  applicationId: process.env.PARSE_SERVER_APPLICATION_ID!,
};

Parse.initialize(parseConfig.applicationId, "");
Parse.serverURL = parseConfig.url;

export default Parse;
