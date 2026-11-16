import { httpClient } from './httpClient'

export const authApi = {
  enter: async payload => (await httpClient.post('/auth/enter', payload, { skipGlobalError: true })).data,
  login: async (payload) => {
    const { data } = await httpClient.post('/auth/login', payload, { skipGlobalError: true })
    return data
  },
  logout: async () => {
    const { data } = await httpClient.post('/auth/logout', null)
    return data
  },
  me: async () => {
    const { data } = await httpClient.get('/auth/me')
    return data
  },
}
