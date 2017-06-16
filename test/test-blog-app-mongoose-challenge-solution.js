const chai = require("chai")
const chaiHttp = require('chai-http')
const faker = require('faker')
const mongoose = require('mongoose')

const should = chai.should()

const {BlogPost} = require('../models')

const {app, runServer, closeServer} = require('../server')
const {TEST_DATABASE_URL} = require('../config')

chai.use(chaiHttp)

function tearDownDb() {
	return new Promise ((resolve,reject) => {
		console.warn('Deleting database')
		mongoose.connection.dropDatabase()
			.then(result => resolve(result))
			.catch(err => reject(err))
	})
}

function generateBlogPostData() {
	return {
		author: {
			firstName: faker.name.firstName(),
			lastName: faker.name.lastName()
		},
		title: faker.lorem.sentence(),
		content: faker.lorem.text()
	}
}

function seedBlogData() {
  const toSeed = []
  for(let i = 0; i<10; i++){
    toSeed.push(generateBlogPostData())
  }
	return BlogPost.insertMany(toSeed)
}

describe('Blog Post API resource', function() {

  before(function() {
    return runServer(TEST_DATABASE_URL);
  });

  beforeEach(function() {
    return seedBlogData();
  });

  afterEach(function() {
    return tearDownDb(); 
  });

  after(function() {
    return closeServer();
  })

  describe('GET endpoint', function() {
  	it("should return all existing blog posts", function() {
	  	let res
	  	return chai.request(app)
	  	.get('/posts')
	  	.then(function(_res){
	  		res = _res
	  		res.should.have.status(200)
	  		res.body.should.have.length.of.at.least(1)
	  		return BlogPost.count()
	  	})
	  	.then(function(count) {
        console.log(count)
	  		res.body.should.have.length(count)
	  	})
	  })
  })

  it("should return blog posts with correct fields", function() {
  	let resBlogPost
  	return chai.request(app)
  	.get('/posts')
  	.then(function(res) {
      // console.log(res.body)
  		res.should.have.status(200)
  		res.should.be.json
  		res.body.should.be.a("array")
  		res.body.should.have.length.of.at.least(1)

  		res.body.forEach(function(post) {
  			post.should.be.a('object')
  			post.should.include.keys( 'id', 'content', 'author', 'title', 'created')
  		})
  		resBlogPost = res.body[0]
  		return BlogPost.findById(resBlogPost.id)
  	})
  	.then(function(post) {
  		resBlogPost.id.should.equal(post.id)
  		resBlogPost.content.should.equal(post.content)
  		resBlogPost.author.should.equal(post.apiRepr().author)
  		resBlogPost.title.should.equal(post.title)
  		// resBlogPost.created.should.equal(post.created)
  	})
  })

  describe('POST endpoint', function() {
  	it("should add a new blog post", function() {

  		const newBlogPost = generateBlogPostData()
      const authorName = newBlogPost.author.firstName + " " + newBlogPost.author.lastName
 
  		return chai.request(app)
  		.post("/posts")
  		.send(newBlogPost)
			.then(function(res) { 
				res.should.have.status(201)
				res.should.be.json
				res.body.should.be.a('object')
				res.body.should.include.keys('id', 'content', 'author', 'title', 'created')
				res.body.author.should.equal(authorName)
				res.body.id.should.not.be.null
				res.body.title.should.equal(newBlogPost.title)
				return BlogPost.findById(res.body.id)
			}) 
			.then(function(post) {
				// post.id.should.equal(newBlogPost.id)
        console.log(post)
  			post.content.should.equal(newBlogPost.content)
  			post.author.firstName.should.equal(newBlogPost.author.firstName)
  			post.title.should.equal(newBlogPost.title)
  			// post.created.should.equal(newBlogPost.created)
			})
  	})
  })

  describe("PUT endpoint", function() {
		it('should update fields specified', function(){
			const updateData = {
				author: 'Grady',
				title: 'Heck Ya'
			}

			return BlogPost
				.findOne()
				.exec()
				.then(function(post) {
					updateData.id = post.id
					return chai.request(app)
						.put(`/posts/${post.id}`)
						.send(updateData)
				})
				.then(function(res) {
					res.should.have.status(201)
					return BlogPost.findById(updateData.id).exec()
				})
				.then(function(post) {
          // console.log(post)
					// post.author.should.equal(updateData.author)
					post.title.should.equal(updateData.title)
				})
		})
  })

  describe('DELETE endpoint', function() {
  	it("should delete blog post by id", function() {
  		let post

  		return BlogPost
  			.findOne()
  			.exec()
  			.then(function(_post) {
  				post = _post
  				return chai.request(app).delete(`/posts/${post.id}`)
  			})
  			.then(function(res) {
          console.log(res)
  				res.should.have.status(204)
  				return BlogPost.findById(post.id)
  			})
  			.then(function(_post){
  				should.not.exist(_post)
  			})
  	})
  })
})