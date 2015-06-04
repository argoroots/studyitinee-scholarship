var PAGE_URL       = 'http://scholarship.studyitin.ee/'
var API_URL        = 'https://hitsa.entu.ee/api2/'
var API_USER       = 3409
var API_KEY        = 'z3Sg6S2ea9NRY5Chhjxg52wcPVy5LQBB'

function cl(d) {
    console.log(d)
}

function getSignedData(user, key, data) {
    if(!user || !key) return

    var conditions = []
    for(k in data) {
        conditions.push({k: data[k]})
    }

    var expiration = new Date()
    expiration.setMinutes(expiration.getMinutes() + 10)

    data['user'] = user
    data['policy'] = CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(JSON.stringify({expiration: expiration.toISOString(), conditions: conditions})))
    data['signature'] = CryptoJS.enc.Base64.stringify(CryptoJS.HmacSHA1(data['policy'], key))

    return data
}

function makeKey() {
    var text = ''
    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

    for(var i=0; i < 64; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length))
    }
    return text
}



angular.module('xApp', ['ngRoute', 'ngResource'])



// ROUTER
    .config(['$locationProvider', '$routeProvider', function($locationProvider, $routeProvider) {
        // $locationProvider.html5Mode(true)
        $routeProvider
            .when('/:sponsor', {
                templateUrl: 'start',
                controller: 'startCtrl'
            })
            .when('/:sponsor/:application_id/:application_key', {
                templateUrl: 'application',
                controller: 'applicationCtrl'
            })
            .otherwise({
                redirectTo: function() {
                    window.location = 'http://studyitin.ee'
                }
            })
    }])


// START
    .controller('startCtrl', ['$rootScope', '$scope', '$http', '$routeParams', function($rootScope, $scope, $http, $routeParams) {
        $rootScope.sponsor = $routeParams.sponsor
        $scope.sponsor = $routeParams.sponsor

        $scope.sendLink = function() {
            if(!$scope.email) return

            if($scope.sponsor === 'skype') {
                var folder_id = 3407
                var email_subject = 'Skype’s Foreign Studies’ Master’s Scholarship 2015'
            } else if($scope.sponsor === 'lhv') {
                var folder_id = 3408
                var email_subject = 'LHV Bank Scholarship for ICT students 2015'
            } else {
                return
            }

            $scope.sending = true
            $scope.key = makeKey()
            $http({
                    method : 'POST',
                    url    : API_URL + 'entity-' + folder_id,
                    data   : getSignedData(API_USER, API_KEY, {
                        'definition': 'person',
                        'person-email': $scope.email,
                        'person-entu-api-key': $scope.key
                    })
                })
                .success(function(data) {
                    $scope.id = data.result.id
                    $http({
                            method : 'POST',
                            url    : API_URL + 'entity-' + $scope.id + '/rights',
                            data   : getSignedData(API_USER, API_KEY, {
                                'entity': $scope.id,
                                'right': 'owner'
                            })
                        })
                        .success(function(data) {
                            var url = PAGE_URL + '#/' + $scope.sponsor + '/' + $scope.id + '/' + $scope.key
                            $http({
                                    method : 'POST',
                                    url    : API_URL + 'entity-' + $scope.id + '/rights',
                                    data   : getSignedData(API_USER, API_KEY, {
                                        'entity': API_USER
                                    })
                                })
                                .success(function(data) {
                                    $http({
                                            method : 'POST',
                                            url    : API_URL + 'entity-' + $scope.id,
                                            data   : getSignedData($scope.id, $scope.key, {
                                                'definition': 'education',
                                                'education-graduation-year': 2015
                                            })
                                        })
                                        .success(function(data) {
                                            $http({
                                                    method : 'POST',
                                                    url    : API_URL + 'email',
                                                    data   : getSignedData(API_USER, API_KEY, {
                                                        'to': $scope.email,
                                                        'subject': email_subject,
                                                        'message': 'Here is the link to your personal scholarship application form. Please keep it safe.<br>\n<br>\n<a href="' + url + '">' + url + '</a><br>\n<br>\nDo not share it!'
                                                    })
                                                })
                                                .success(function(data) {
                                                    $scope.sending = false
                                                    $scope.sent = true
                                                })
                                                .error(function(data) {
                                                    cl(data.error)
                                                    $scope.sending = false
                                                })
                                        })
                                        .error(function(data) {
                                            cl(data.error)
                                            $scope.sending = false
                                        })
                                })
                                .error(function(data) {
                                    cl(data.error)
                                    $scope.sending = false
                                })
                        })
                        .error(function(data) {
                            cl(data.error)
                            $scope.sending = false
                        })
                })
                .error(function(data) {
                    cl(data.error)
                    $scope.sending = false
                })
        }
    }])



// APPLICATION
    .controller('applicationCtrl', ['$rootScope', '$scope', '$http', '$routeParams', '$location', '$timeout', function($rootScope, $scope, $http, $routeParams, $location, $timeout) {
        $rootScope.sponsor = $routeParams.sponsor
        $scope.sponsor = $routeParams.sponsor
        $scope.application = {}
        $scope.education = {}

        $http({
                method : 'GET',
                url    : API_URL + 'entity-' + $routeParams.application_id,
                params : getSignedData($routeParams.application_id, $routeParams.application_key, {})
            })
            .success(function(data) {
                for(key in data.result.properties) {
                    if(data.result.properties[key].values) {
                        if(data.result.properties[key].datatype == 'boolean') {
                            $scope.application[key.replace('-', '_')] = {
                                id: data.result.properties[key].values[0].id,
                                old: Boolean(data.result.properties[key].values[0].db_value),
                                value: Boolean(data.result.properties[key].values[0].db_value)
                            }
                        } else if(data.result.properties[key].datatype == 'file') {
                            $scope.application[key.replace('-', '_')] = {}
                            for(f in data.result.properties[key].values) {
                                $scope.application[key.replace('-', '_')][data.result.properties[key].values[f].id] = {
                                    id: data.result.properties[key].values[f].id,
                                    old: data.result.properties[key].values[f].value,
                                    value: data.result.properties[key].values[f].value
                                }
                            }
                        } else {
                            $scope.application[key.replace('-', '_')] = {
                                id: data.result.properties[key].values[0].id,
                                old: data.result.properties[key].values[0].value,
                                value: data.result.properties[key].values[0].value
                            }
                        }
                    }
                }
                $http({
                        method : 'GET',
                        url    : API_URL + 'entity-' + $routeParams.application_id + '/childs?definition=education',
                        params : getSignedData($routeParams.application_id, $routeParams.application_key, {})
                    })
                    .success(function(data) {
                        for(key in data.result.education.entities) {
                            $http({
                                    method : 'GET',
                                    url    : API_URL + 'entity-' + data.result.education.entities[key].id,
                                    params : getSignedData($routeParams.application_id, $routeParams.application_key, {})
                                })
                                .success(function(data) {
                                    $scope.education[data.result.id] = {}
                                    for(key in data.result.properties) {
                                        if(data.result.properties[key].values) {
                                            $scope.education[data.result.id][key.replace('-', '_')] = {
                                                id: data.result.properties[key].values[0].id,
                                                old: data.result.properties[key].values[0].value,
                                                value: data.result.properties[key].values[0].value
                                            }
                                        }
                                    }
                                })
                        }
                    })

            })
            .error(function(data) {
                $location.path('/')
            })

        $scope.doSave = function(e) {
            var target = e.target || e.srcElement
            var field = angular.element(target).attr('id')
            var property = 'person-' + field.replace('_', '-')

            if(!$scope.application[field]) return
            if(!$scope.application[field].old && $scope.application[field].value || $scope.application[field].value != $scope.application[field].old) {
                $scope.sending = true

                if($scope.application[field].id) property += '.' + $scope.application[field].id

                var properties = {}
                properties[property] = $scope.application[field].value

                $http({
                        method : 'PUT',
                        url    : API_URL + 'entity-' + $routeParams.application_id,
                        data   : getSignedData($routeParams.application_id, $routeParams.application_key, properties)
                    })
                    .success(function(data) {
                        var property = 'person-' + field.replace('_', '-')
                        if(data.result.properties[property]) {
                            $scope.application[field] = {
                                id: data.result.properties[property][0].id,
                                old: $scope.application[field].value,
                                value: $scope.application[field].value
                            }
                        } else {
                            $scope.application[field] = {}
                        }
                        $scope.sending = false
                    })
                    .error(function(data) {
                        cl(data.error)
                        $scope.sending = false
                    })
            }
        }

        $scope.doUniAdd = function(e) {
            $http({
                    method : 'POST',
                    url    : API_URL + 'entity-' + $routeParams.application_id,
                    data   : getSignedData($routeParams.application_id, $routeParams.application_key, {
                        'definition': 'education',
                        'education-graduation-year': 2015
                    })
                })
                .success(function(data) {
                    $http({
                            method : 'GET',
                            url    : API_URL + 'entity-' + data.result.id,
                            params : getSignedData($routeParams.application_id, $routeParams.application_key, {})
                        })
                        .success(function(data) {
                            $scope.education[data.result.id] = {}
                            for(key in data.result.properties) {
                                if(data.result.properties[key].values) {
                                    $scope.education[data.result.id][key.replace('-', '_')] = {
                                        id: data.result.properties[key].values[0].id,
                                        old: data.result.properties[key].values[0].value,
                                        value: data.result.properties[key].values[0].value
                                    }
                                }
                            }
                        })
                })
                .error(function(data) {
                    cl(data.error)
                    $scope.sending = false
                })
        }

        $scope.doUniSave = function(e) {
            var target = e.target || e.srcElement
            var field = angular.element(target).attr('id').split('-')[0]
            var id = angular.element(target).attr('id').split('-')[1]
            var property = 'education-' + field.replace('_', '-')

            if(!$scope.education[id][field]) return
            if(!$scope.education[id][field].old && $scope.education[id][field].value || $scope.education[id][field].value != $scope.education[id][field].old) {
                $scope.sending = true

                if($scope.education[id][field].id) property += '.' + $scope.education[id][field].id

                var properties = {}
                properties[property] = $scope.education[id][field].value

                $http({
                        method : 'PUT',
                        url    : API_URL + 'entity-' + id,
                        data   : getSignedData($routeParams.application_id, $routeParams.application_key, properties)
                    })
                    .success(function(data) {
                        var property = 'education-' + field.replace('_', '-')
                        if(data.result.properties[property]) {
                            $scope.education[id][field] = {
                                id: data.result.properties[property][0].id,
                                old: $scope.education[id][field].value,
                                value: $scope.education[id][field].value
                            }
                        } else {
                            $scope.education[id][field] = {}
                        }
                        $scope.sending = false
                    })
                    .error(function(data) {
                        cl(data.error)
                        $scope.sending = false
                    })
            }
        }

        $scope.fakeSave = function() {
            $scope.sending = true
            $timeout(function() {
                $scope.sending = false
            }, 3000)
        }

        $scope.doFileUpload = function(e) {
            $scope.sending = true

            var field = e.id
            var file  = e.files[0]
            var xhr   = new XMLHttpRequest()
            var form  = new FormData()

            var form_data = getSignedData($routeParams.application_id, $routeParams.application_key, {
                entity   : $routeParams.application_id,
                property : 'person-' + field.replace('_', '-'),
                filename : file.name
            })

            for(var i in form_data) {
                form.append(i, form_data[i])
            }
            form.append('file', file)

            xhr.upload.addEventListener('progress', function (ev) {
                if(!ev.lengthComputable) return
                if(!$scope.application[field]) $scope.application[field] = {progress: 0}
                $scope.application[field]['progress'] = (ev.loaded * 100 / ev.total - 0.1).toFixed(1)
                    $scope.$apply()
            }, false)

            xhr.onreadystatechange = function(ev) {
                if(xhr.readyState != 4) return
                if(xhr.status == 200) {
                    var property = 'person-' + field.replace('_', '-')
                    var data = JSON.parse(xhr.response)
                    if(data.result.properties[property]) {
                        delete $scope.application[field]['progress']
                        $scope.application[field][data.result.properties[property][0].id] = {
                            id: data.result.properties[property][0].id,
                            old: data.result.properties[property][0].value,
                            value: data.result.properties[property][0].value
                        }
                        $scope.$apply()
                    }
                    $scope.sending = false
                } else {
                    cl(xhr)
                    $scope.application[field] = {}
                    $scope.$apply()
                }
            }

            xhr.open('POST', API_URL + 'file', true)
            xhr.send(form)
        }

        $scope.doFileDelete = function(field, id) {

            if(!window.confirm('Are you sure, you want to delete this file?')) return

            var properties = {}

            properties['person-' + field.replace('_', '-') + '.' + id] = ''

            $http({
                    method : 'PUT',
                    url    : API_URL + 'entity-' + $routeParams.application_id,
                    params : getSignedData($routeParams.application_id, $routeParams.application_key, properties)
                })
                .success(function(data) {
                    delete $scope.application[field][id]
                })
                .error(function(data) {
                    cl(data.error)
                })
        }

        $scope.doCancel = function() {

            if(!window.confirm('Are you sure, you want to cancel your application? If you change your mind later, you must start over again.')) return

            $http({
                    method : 'DELETE',
                    url    : API_URL + 'entity-' + $routeParams.application_id,
                    params : getSignedData($routeParams.application_id, $routeParams.application_key, {})
                })
                .success(function(data) {
                    $location.path('/')
                })
                .error(function(data) {
                    cl(data.error)
                })
        }
    }])
