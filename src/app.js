const path = require('node:path');
const express = require('express');

const app = express();

// Posts are intentionally stored in memory for this project.
const posts = [];
let nextPostId = 1;

function parseTags(tagsInput) {
  // Store tags consistently so filtering is case-insensitive and duplicates are removed.
  return [...new Set(
    (tagsInput || '')
      .split(',')
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean),
  )];
}

function getPostViewData(query = {}) {
  // Filter and sort first, then paginate the result so every view has the same rules.
  const selectedTag = typeof query.tag === 'string' ? query.tag.trim().toLowerCase() : '';
  const sortOrder = query.sort === 'oldest' ? 'oldest' : 'newest';
  const filteredPosts = posts
    .filter((post) => !selectedTag || post.tags.includes(selectedTag))
    .sort((firstPost, secondPost) => {
      const difference = firstPost.createdAt - secondPost.createdAt;
      return sortOrder === 'oldest' ? difference : -difference;
    });
  const availableTags = [...new Set(posts.flatMap((post) => post.tags))].sort();
  const pageSize = 5;
  const requestedPage = Number.parseInt(query.page, 10);
  const pageCount = Math.max(1, Math.ceil(filteredPosts.length / pageSize));
  const currentPage = Math.min(
    Math.max(Number.isNaN(requestedPage) ? 1 : requestedPage, 1),
    pageCount,
  );
  const startIndex = (currentPage - 1) * pageSize;

  return {
    posts: filteredPosts.slice(startIndex, startIndex + pageSize),
    totalPosts: filteredPosts.length,
    availableTags,
    selectedTag,
    sortOrder,
    currentPage,
    pageCount,
  };
}

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, '..', 'public')));

// The homepage handles the main post workflow; individual edit pages keep updates simple.
app.get('/', (request, response) => {
  const viewData = getPostViewData(request.query);

  response.render('index', {
    pageTitle: 'Local Blog',
    ...viewData,
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
      totalPosts: posts.length,
      currentPage: 1,
      pageCount: 1,
      formData: request.body,
      error: 'Please enter your name, title, and blog content.',
    });
  }

  // New posts appear first, while the timestamp records when they were created.
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

  // Reactions are deliberately simple counters. for this local account-free app it is difficult and unnecessary to implement user-specific reactions.
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