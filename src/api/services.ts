import axios from 'axios'
import API_BASE_URL from './baseUrl'

export async function getServices(): Promise<unknown> {
  const response = await axios.get(`${API_BASE_URL}organization/header`, {
    params: {
      gslType: 7,
    },
  })

  return response.data
}