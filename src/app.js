const path = require('node:path');
const express = require('express');

const app = express();

// Posts are intentionally stored in memory for this project.
const posts = [];
let nextPostId = 1;

function parseTags(tagsInput) {
  return [...new Set(
    (tagsInput || '')
      .split(',')
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean),
  )];
}

function getPostViewData(query = {}) {
  const selectedTag = typeof query.tag === 'string' ? query.tag.trim().toLowerCase() : '';
  const sortOrder = query.sort === 'oldest' ? 'oldest' : 'newest';
  const filteredPosts = posts
    .filter((post) => !selectedTag || post.tags.includes(selectedTag))
    .sort((firstPost, secondPost) => {
      const difference = firstPost.createdAt - secondPost.createdAt;
      return sortOrder === 'oldest' ? difference : -difference;
    });
  const availableTags = [...new Set(posts.flatMap((post) => post.tags))].sort();

  return { filteredPosts, availableTags, selectedTag, sortOrder };
}

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/', (request, response) => {
  const { filteredPosts, availableTags, selectedTag, sortOrder } = getPostViewData(request.query);

  response.render('index', {
    pageTitle: 'Local Blog',
    posts: filteredPosts,
    availableTags,
    selectedTag,
    sortOrder,
    formData: {},
    error: null,
  });
});

app.post('/posts', (request, response) => {
  const { author, title, content, tags } = request.body;

  if (!author?.trim() || !title?.trim() || !content?.trim()) {
    return response.status(400).render('index', {
      pageTitle: 'Local Blog',
      posts,
      availableTags: [...new Set(posts.flatMap((post) => post.tags))].sort(),
      selectedTag: '',
      sortOrder: 'newest',
      formData: request.body,
      error: 'Please enter your name, title, and blog content.',
    });
  }

  posts.unshift({
    id: nextPostId++,
    author: author.trim(),
    title: title.trim(),
    content: content.trim(),
    tags: parseTags(tags),
    createdAt: new Date(),
    likes: 0,
    dislikes: 0,
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

  const { author, title, content, tags } = request.body;

  if (!author?.trim() || !title?.trim() || !content?.trim()) {
    return response.status(400).render('edit', {
      pageTitle: `Edit ${post.title}`,
      post: { ...post, author, title, content, tags: parseTags(tags), tagsInput: tags },
      error: 'Please enter your name, title, and blog content.',
    });
  }

  post.author = author.trim();
  post.title = title.trim();
  post.content = content.trim();
  post.tags = parseTags(tags);
  post.updatedAt = new Date();

  response.redirect('/');
});

app.post('/posts/:id/react', (request, response) => {
  const post = posts.find((candidate) => candidate.id === Number(request.params.id));

  if (!post) {
    return response.status(404).send('Post not found.');
  }

  if (request.body.reaction === 'like') {
    post.likes += 1;
  } else if (request.body.reaction === 'dislike') {
    post.dislikes += 1;
  } else {
    return response.status(400).send('Invalid reaction.');
  }

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