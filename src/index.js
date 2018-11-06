import '@babel/polyfill'

import axios from 'axios'

const api = axios.create({
  baseURL: process.env.API_URL
})

api.interceptors.request.use(function (config) {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers = config.headers || {}
    config.headers['Authorization'] = 'Bearer ' + token
  }
  return config
});

const templates = {
  loginForm: document.querySelector('#login-form').content,
  postList: document.querySelector('#post-list').content,
  postItem: document.querySelector('#post-item').content,
  postForm: document.querySelector('#post-form').content,
  postDetail: document.querySelector('#post-detail').content,
  commentItem: document.querySelector('#comment-item').content,
}

const rootEl = document.querySelector('.root')

// 페이지 그리는 함수 작성 순서
// 1. 템플릿 복사
// 2. 요소 선택
// 3. 필요한 데이터 불러오기
// 4. 내용 채우기
// 5. 이벤트 리스너 등록하기
// 6. 템플릿을 문서에 삽입

async function drawLoginForm() {
  // 1. 템플릿 복사
  const frag = document.importNode(templates.loginForm, true)

  // 2. 요소 선택
  const formEl = frag.querySelector('.login-form')

  // 3. 필요한 데이터 불러오기 - 필요없음
  // 4. 내용 채우기 - 필요없음

  // 5. 이벤트 리스너 등록하기
  formEl.addEventListener('submit', async e => {
    e.preventDefault()
    const username = e.target.elements.username.value
    const password = e.target.elements.password.value
    const res = await api.post('/users/login', {
      username,
      password
    })
    localStorage.setItem('token', res.data.token)
    drawPostList()
  })

  // 6. 템플릿을 문서에 삽입
  rootEl.textContent = ''
  rootEl.appendChild(frag)
}

async function drawPostList() {
  // 1. 템플릿 복사
  const frag = document.importNode(templates.postList, true)

  // 2. 요소 선택
  const listEl = frag.querySelector('.post-list')
  const createBtnEl = frag.querySelector(".create");
  const logoutEl = frag.querySelector('.logout')

  // 3. 필요한 데이터 불러오기
  const { data: postList } = await api.get('/posts?_expand=user')

  // 4. 내용 채우기
  postList.forEach(postItem => {
    // 1. 템플릿 복사
    const frag = document.importNode(templates.postItem, true)

    // 2. 요소 선택
    const idEl = frag.querySelector('.id')
    const titleEl = frag.querySelector('.title')
    const authorEl = frag.querySelector('.author')

    // 3. 필요한 데이터 불러오기 - 필요 없음
    // 4. 내용 채우기
    idEl.textContent = postItem.id
    titleEl.textContent = postItem.title
    authorEl.textContent = postItem.user.username

    // 5. 이벤트 리스너 등록하기
    titleEl.addEventListener('click', e => {
      drawPostDetail(postItem.id)
    })

    // 6. 템플릿을 문서에 삽입
    listEl.appendChild(frag)
  })

  // 5. 이벤트 리스너 등록하기
  createBtnEl.addEventListener('click', e => {
    drawNewPostForm();
  })
  logoutEl.addEventListener('click', e => {
    localStorage.removeItem("token");
    drawLoginForm()
  })
  // 6. 템플릿을 문서에 삽입
  rootEl.textContent = ''
  rootEl.appendChild(frag)
}

async function drawPostDetail(postId) {
  // 1. 템플릿 복사
  const frag = document.importNode(templates.postDetail, true)

  // 2. 요소 선택
  // 2-1. 상세 페이지 관련
  const titleEl = frag.querySelector('.title')
  const authorEl = frag.querySelector('.author')
  const bodyEl = frag.querySelector('.body')
  // 2-2. 버튼 관련
  const deleteEl = frag.querySelector('.delete')
  const backEl = frag.querySelector(".back")
  const updateEl = frag.querySelector('.update')
  // 2-3. 코멘트 관련
  const commentFormEl = frag.querySelector('.comment-form')
  const commentListEl = frag.querySelector(".comment-list")
  // 3. 필요한 데이터 불러오기
  const {data: {title, body, user, comments}} = await api.get('/posts/' + postId, {
    params: {
      _expand: 'user',
      _embed: 'comments'
    }
    // +?_expand=user&_embed=comments 라고 써도 됨.
  })
  const params = new URLSearchParams()
  comments.forEach(c => {
    params.append("id", c.userId);
  })
  const { data: userList } = await api.get("/users/", { params });
  // 아래와 같이 해도 되지만, 댓글을 이미 한번 불러왔는데 또 불러오는 것은 낭비이므로 위와 같은 코드가 더 좋다.
  // const { data: userList } = await api.get("/comments/" + postId, {
  //   params: {
  //     _expand: 'user'
  //   }
  // })
  // 4. 내용 채우기
  titleEl.textContent = title
  bodyEl.textContent = body
  authorEl.textContent = user.username

  for(const commentItem of comments){
    // 1. 템플릿 복사
    const frag = document.importNode(templates.commentItem, true)
    // 2. 요소 선택
    const authorEl = frag.querySelector('.author')
    const bodyEl = frag.querySelector('.body')
    const deleteEl = frag.querySelector('.delete')
    // 3. 필요한 데이터 불러오기 - 필요 없음
    // 4. 내용 채우기
    bodyEl.textContent = commentItem.body
    const user = userList.find(item => item.id === commentItem.userId)
    authorEl.textContent = user.username
    // authorEl.textContent = userList.user.username;
    // 5. 이벤트 리스너 등록하기
    const { data: { id } } = await api.get("/me");
    if (id === user.id) {
      deleteEl.classList.remove('hidden')
      deleteEl.addEventListener('click', async e => {
        await api.delete("/comments/" + commentItem.id);
        drawPostDetail(postId)
      })
    }
    // 6. 템플릿을 문서에 삽입
    commentListEl.appendChild(frag)
  }
  // 5. 이벤트 리스너 등록하기
  updateEl.addEventListener('click', async e => {
    const { data: { id } } = await api.get('/me')
    if(id === user.id){
      drawEditPostForm(postId)
    }else{
      alert('다른 사람이 쓴 글은 수정할 수 없습니다.')
    }
  })
  backEl.addEventListener('click', e => {
    e.preventDefault() // 새 글이 써지는 것을 방지하기 위함 - 폼의 submit 이벤트가 일어나지 않게 함
    drawPostList()
  })
  deleteEl.addEventListener("click", async e => {
    const { data: { id } } = await api.get('/me')
    if (id === user.id) {
      await api.delete("/posts/" + postId);
      drawPostList();
    } else {
      alert('다른 사람이 쓴 글은 삭제할 수 없습니다.')
    }
  });
  backEl.addEventListener('click', e => {
    drawPostList()
  })
  commentFormEl.addEventListener('submit', async e => {
    e.preventDefault()
    const body = e.target.elements.body.value
    await api.post("/comments/?postId=" + postId, {
      body,
      postId
    });
    drawPostDetail(postId)
  })
  // 6. 템플릿을 문서에 삽입
  rootEl.textContent = ''
  rootEl.appendChild(frag)
}

async function drawNewPostForm() {
  // 1. 템플릿 복사
  const frag = document.importNode(templates.postForm, true);
  // 2. 요소 선택
  const formEl = frag.querySelector('.post-form')
  const backEl = frag.querySelector('.back')
  // 3. 필요한 데이터 불러오기
  // 4. 내용 채우기
  // 5. 이벤트 리스너 등록하기
  formEl.addEventListener('submit', async e => {
    e.preventDefault() // 브라우저 내장 전송 기능이 동작하는 것을 방지
    const title = e.target.elements.title.value
    const body = e.target.elements.body.value
    await api.post('/posts', {
      title,
      body
    })
    drawPostList()
  })
  backEl.addEventListener('click', e => {
    e.preventDefault() // 새 글이 써지는 것을 방지하기 위함 - 폼의 submit 이벤트가 일어나지 않게 함
    drawPostList()
  })
  // 6. 템플릿을 문서에 삽입
  rootEl.textContent = "";
  rootEl.appendChild(frag);
}

async function drawEditPostForm(postId) {
  // 1. 템플릿 복사
  const frag = document.importNode(templates.postForm, true);
  // 2. 요소 선택
  const formEl = frag.querySelector('.post-form')
  const backEl = frag.querySelector('.back')
  const titleEl = frag.querySelector('.title')
  const bodyEl = frag.querySelector('.body')
  // 3. 필요한 데이터 불러오기
  const { data: { title, body } } = await api.get('/posts/' + postId, {
    params: {
      _expand: 'user',
      _embed: 'comments'
    }
  })
  // 4. 내용 채우기
  titleEl.value = title
  // 왜 textContent가 아니라 value일까? 찾아봐야겠다
  bodyEl.value = body

  // 5. 이벤트 리스너 등록하기
  formEl.addEventListener('submit', async e => {
    e.preventDefault() // 브라우저 내장 전송 기능이 동작하는 것을 방지
    const title = e.target.elements.title.value
    const body = e.target.elements.body.value
    await api.patch('/posts/' + postId, {
      title,
      body
    })
    drawPostList()
  })
  backEl.addEventListener('click', e => {
    e.preventDefault()
    drawPostList()
  })

  // 6. 템플릿을 문서에 삽입
  rootEl.textContent = "";
  rootEl.appendChild(frag);
}

// 페이지 로드 시 그릴 화면 설정
if (localStorage.getItem('token')) {
  drawPostList()
} else {
  drawLoginForm()
}
