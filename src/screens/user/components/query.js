import {useContext, useReducer, useEffect, useRef} from 'react'
import PropTypes from 'prop-types'
import isEqual from 'lodash/isEqual'
import * as GitHub from '../../../github-client'

function useSetState(initialState) {
  const [state, setState] = useReducer(
    (state, newState) => ({...state, ...newState}),
    initialState,
  )
  return [state, setState]
}

function useSafeSetState(initialState) {
  const [state, setState] = useSetState(initialState)

  const mountedRef = useRef(false)
  useEffect(() => {
    mountedRef.current = true
    return () => (mountedRef.current = false)
  }, [])
  const safeSetState = (...args) => mountedRef.current && setState(...args)

  return [state, safeSetState]
}

function usePrevious(value) {
  const ref = useRef()
  useEffect(() => {
    ref.current = value
  })
  return ref.current
}

function useDeepCompareEffect(callback, inputs) {
  const cleanupRef = useRef()
  useEffect(() => {
    if (!isEqual(previousInputs, inputs)) {
      cleanupRef.current = callback()
    }
    return cleanupRef.current
  })
  const previousInputs = usePrevious(inputs)
}

function Query({query, variables, children, normalize = data => data}) {
  const client = useContext(GitHub.Context)
  const [state, setState] = useSafeSetState({
    loaded: false,
    fetching: false,
    data: null,
    error: null,
  })

  useDeepCompareEffect(
    () => {
      setState({fetching: true})
      client
        .request(query, variables)
        .then(res =>
          setState({
            data: normalize(res),
            error: null,
            loaded: true,
            fetching: false,
          }),
        )
        .catch(error =>
          setState({
            error,
            data: null,
            loaded: false,
            fetching: false,
          }),
        )
    },
    [query, variables],
  )

  return children(state)
}

Query.propTypes = {
  query: PropTypes.string.isRequired,
  variables: PropTypes.object,
  children: PropTypes.func.isRequired,
  normalize: PropTypes.func,
}

export default Query
