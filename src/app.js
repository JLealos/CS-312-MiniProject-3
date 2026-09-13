const path = require('node:path');
const express = require('express');

const app = express();

// Posts are intentionally stored in memory for this project.
const posts = [];
let nextPostId = 1;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/', (request, response) => {
  response.render('index', {
    pageTitle: 'Local Blog',
    posts,
    formData: {},
    error: null,
  });
});

app.post('/posts', (request, response) => {
  const { author, title, content } = request.body;

  if (!author?.trim() || !title?.trim() || !content?.trim()) {
    return response.status(400).render('index', {
      pageTitle: 'Local Blog',
      posts,
      formData: request.body,
      error: 'Please enter your name, title, and blog content.',
    });
  }

  posts.unshift({
    id: nextPostId++,
    author: author.trim(),
    title: title.trim(),
    content: content.trim(),
    createdAt: new Date(),
  });

  response.redirect('/');
});

app.get('/posts/:id/edit', (request, response) => {
  const post = posts.find((candidate) => candidate.id === Number(request.params.id));

  if (!post) {
    return response.status(404).send('Post not found.');
  }

  response.render('edit', {
    pageTitle: `Edit ${post.title}`,
    post,
    error: null,
  });
});

app.post('/posts/:id/edit', (request, response) => {
  const post = posts.find((candidate) => candidate.id === Number(request.params.id));

  if (!post) {
    return response.status(404).send('Post not found.');
  }

  const { author, title, content } = request.body;

  if (!author?.trim() || !title?.trim() || !content?.trim()) {
    return response.status(400).render('edit', {
      pageTitle: `Edit ${post.title}`,
      post: { ...post, author, title, content },
      error: 'Please enter your name, title, and blog content.',
    });
  }

  post.author = author.trim();
  post.title = title.trim();
  post.content = content.trim();
  post.updatedAt = new Date();

  response.redirect('/');
});

app.post('/posts/:id/delete', (request, response) => {
  const postIndex = posts.findIndex(
    (post) => post.id === Number(request.params.id),
  );

  if (postIndex === -1) {
    return response.status(404).send('Post not found.');
  }

  posts.splice(postIndex, 1);
  response.redirect('/');
});

app.get('/health', (request, response) => {
  response.json({ status: 'ok' });
});

module.exports = app;