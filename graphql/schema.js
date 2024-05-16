const { buildSchema } = require('graphql')

module.exports = buildSchema(`
    type Post {
        _id: ID!
        title: String!
        content: String!
        imageUrl: String!
        creator: User!
        createdAt: String!
        updatedAt: String!
    }
    type User {
        _id: ID!
        email: String!
        password: String
        name: String! 
        status: String!
        posts: [Post!]!
    }
    input UserInputData {
        email: String!
        password: String!
        name: String!
    }
    input PostInputData {
        title: String!
        content: String!
        imageUrl: String!
    }
    type AuthData {
        token: String!
        userId: String!
    }
    type PostsData {
        posts: [Post!]!
        totalPosts: Int!
    }

    type RootQuery {
        login(email: String!, password: String!): AuthData
        getPosts(page: Int!): PostsData
        getPostById(postId: ID!): Post!
        user: User!
    }
    type RootMutation {
        createUser (userInput: UserInputData): User!
        createPost (postInput: PostInputData): Post!
        updatePost (id: ID!, postInput: PostInputData): Post!
        deletePost (id: ID!): Boolean
        updateStatus (status: String!): User!
    } 

    schema {
        query: RootQuery
        mutation: RootMutation
    }
`)
