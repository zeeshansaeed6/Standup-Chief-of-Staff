export const PR_QUERY = `
  query GetRepoPullRequests($owner: String!, $name: String!) {
    repository(owner: $owner, name: $name) {
      pullRequests(first: 25, states: OPEN, orderBy: {field: UPDATED_AT, direction: DESC}) {
        nodes {
          id
          number
          title
          url
          createdAt
          updatedAt
          mergeable
          reviewDecision
          author {
            login
          }
          assignees(first: 5) {
            nodes {
              login
            }
          }
          reviewRequests(first: 10) {
            nodes {
              requestedReviewer {
                ... on User {
                  login
                }
              }
            }
          }
          labels(first: 10) {
            nodes {
              name
            }
          }
          commits(last: 1) {
            nodes {
              commit {
                statusCheckRollup {
                  state
                }
              }
            }
          }
          comments(last: 5) {
            totalCount
            nodes {
              author {
                login
              }
              body
              createdAt
            }
          }
          files(first: 20) {
            nodes {
              path
              additions
              deletions
            }
          }
        }
      }
    }
  }
`;

export const ISSUES_QUERY = `
  query GetRepoIssues($owner: String!, $name: String!) {
    repository(owner: $owner, name: $name) {
      issues(first: 25, states: OPEN, orderBy: {field: UPDATED_AT, direction: DESC}) {
        nodes {
          id
          number
          title
          url
          createdAt
          updatedAt
          author {
            login
          }
          assignees(first: 5) {
            nodes {
              login
            }
          }
          labels(first: 10) {
            nodes {
              name
            }
          }
        }
      }
    }
  }
`;
