import Typorama from '../../../src';
import {expect} from 'chai';
import sinon from 'sinon';
import builders from '../builders';
import lifeCycleAsserter from '../lifecycle.js';
import {revision} from '../../../src/lifecycle.js';

function testReadFunctionality(builders, isReadonly) {
	function getNewUsers(usersIterable){
		return Array.from(usersIterable).map(e=>new builders.UserType(e));
	}
	describe(typeOfObj(isReadonly) +' instance', () => {
		var userA, userB, usersMap, usersMapInitialState;
		beforeEach('init example data', () => {
			userA = new builders.UserType({age:1000});
			userB = new builders.UserType({age:1001});
			usersMapInitialState = [[userA, userB], [userB, userA]];
			usersMap = builders.aUserTypeMap(usersMapInitialState);
		});

		describe("with global freeze config", () => {
			before("set global freeze configuration",() => {
				Typorama.config.freezeInstance = true;
			});
			after("clear global freeze configuration",() => {
				Typorama.config.freezeInstance = false;
			});
			it("should throw error on unknown field setter", () => {
				var numbers = builders.aNumberMap();
				expect(function () {
					numbers['boo'] = 4;
				}).to.throw('object is not extensible');
			});
		});

		describe('as field on data object', () => {
			var GroupType;
			before(() => {
				GroupType = Typorama.define('GroupType', {
					spec: function () {
						return {
							title: Typorama.String,
							users: Typorama.Map.of(Typorama.String, builders.UserType)
						};
					}
				});
			});
			it('Should be instantiatable ', () => {
				expect(() => new GroupType()).not.to.throw();
			});
			it('Should be modified from json ', () => {
				var groupData = new GroupType();
				groupData.users = Typorama.Map.of(Typorama.String, builders.UserType).create({
					tom: {'name': 'tom', 'age': 25},
					omri: {'name': 'omri', 'age': 35}
				});
				expect(groupData.users.get('tom').name).to.equal('tom');
				expect(groupData.users.get('tom').age).to.equal(25);
				expect(groupData.users.get('omri').name).to.equal('omri');
				expect(groupData.users.get('omri').age).to.equal(35);
			});
		});

		describe('size', function () {
			it('should reflect number of entries in map', function () {
				var numbers = builders.aNumberMap({1: 1, 2: 2, 3: 3});
				expect(numbers.size).to.equal(3);
			});
		});

		describe('toJSON', () => {
			it('should return entries json array by default', ()  => {
				expect(usersMap.toJSON(), JSON.stringify(usersMap.toJSON())).to.eql([
					[userA.toJSON(), userB.toJSON()],
					[userB.toJSON(), userA.toJSON()]
				]);
			});
			it('should return entries array if not recursive', ()  => {
				expect(usersMap.toJSON(false)[0][0]).to.equal(userA);
				expect(usersMap.toJSON(false)[0][1]).to.equal(userB);
				expect(usersMap.toJSON(false)[1][0]).to.equal(userB);
				expect(usersMap.toJSON(false)[1][1]).to.equal(userA);
			});
			it('should expose '+typeOfObj(isReadonly)+' entries', ()  => {
				expect(usersMap.toJSON(false)[0][0].$isReadOnly(), 'key is readOnly').to.equal(isReadonly);
				expect(usersMap.toJSON(false)[0][1].$isReadOnly(), 'value is readonly').to.equal(isReadonly);
			});
			it('should return object if all keys are strings', () => {
				const jsonModel = {'one':1, 'two':2, 'three':3};
				var numbersMap = builders.aNumberMap(jsonModel);
				expect(numbersMap.toJSON()).to.eql(jsonModel);
			});
			it('should return empty object if empty and supports string keys', () => {
				const jsonModel = {};
				var numbersMap = builders.aNumberMap(jsonModel);
				expect(numbersMap.toJSON()).to.eql(jsonModel);
			});
			it('should return empty array if empty and does not support string keys', () => {
				const jsonModel = [];
				let map = builders.aUserTypeMap(jsonModel);
				expect(map.toJSON()).to.eql(jsonModel);
			});
		});

		describe('clear', () => {
			if (isReadonly){
				it('should not change map', ()  => {
					const jsonModel = {a: 1};
					var numbers = builders.aNumberMap(jsonModel);
					numbers.clear();
					expect(numbers.toJSON()).to.eql(jsonModel);
				});
			} else {
				it('should remove all elements', ()  => {
					var numbers = builders.aNumberMap({a: 1});
					numbers.clear();
					expect(numbers.toJSON()).to.eql({});
				});
			}
		});

		describe('delete',() => {
			describe('when called with non-existing key', () => {
				it('should not change map ', ()  => {
					const jsonModel = {a: 1};
					var numbers = builders.aNumberMap(jsonModel);
					numbers.delete('b');
					expect(numbers.toJSON()).to.eql(jsonModel);
				});
				it('should return false', ()  => {
					var numbers = builders.aNumberMap({a: 1});
					expect(numbers.delete('b')).to.eql(false);
				});
			});
			describe('when called with existing key', () => {
				if (isReadonly) {
					it('should not change map', ()  => {
						const jsonModel = {a: 1};
						var numbers = builders.aNumberMap(jsonModel);
						numbers.delete('a');
						expect(numbers.toJSON()).to.eql(jsonModel);
					});
					it('should return false', () => {
						var numbers = builders.aNumberMap({a: 5});
						expect(numbers.delete('a')).to.equal(false);
					});
				} else {
					it('should remove matching element', ()  => {
						var numbers = builders.aNumberMap({a: 1});
						numbers.delete('a');
						expect(numbers.toJSON()).to.eql({});
					});
					it('should support a typorama object as an argument', ()  => {
						usersMap.delete(userA);
						expect(usersMap.toJSON(false)).to.eql([[userB, userA]]);
					});
					it('should return true', () => {
						var numbers = builders.aNumberMap({a: 5});
						expect(numbers.delete('a')).to.equal(true);
					});
				}
			});
			if (!isReadonly) {
				lifeCycleAsserter.assertMutatorContract(
					(map, elemFactory) => map.delete(map.toJSON()[0][0]), 'delete');
			}
		});
		describe('entries',() => {
			it('should return an array of the map elements', () => {
				var array = builders.aNumberMap({a: 1, b:2}).entries();
				expect(array).to.eql([['a', 1], ['b', 2]]);
			});

			it('should expose '+typeOfObj(isReadonly)+' entries', ()  => {
				var element = usersMap.entries()[0];

				expect(element[0].$isReadOnly(), 'key is readOnly').to.equal(isReadonly);
				expect(element[1].$isReadOnly(), 'value is readonly').to.equal(isReadonly);
			});
		});

		describe('forEach', () => {
			it('should iterate over the map elements', () => {
				var ctx = {count:0};
				var map = builders.aNumberMap({a: 1});
				map.forEach(function (val, key, collection){
					this.count++;
					expect(val, 'value').to.equal(1);
					expect(key, 'key').to.equal('a');
					expect(collection, 'collection itself passed as 3rd argument').to.equal(map);
					expect(this, 'context argument').to.equal(ctx);
				}, ctx);
				expect(ctx.count, 'how many iterations').to.eql(1);
			});

			it('should expose '+typeOfObj(isReadonly)+' entries', ()  => {
				usersMap.forEach((val, key)=>{
					expect(key.$isReadOnly(), 'key is readOnly').to.equal(isReadonly);
					expect(val.$isReadOnly(), 'value is readonly').to.equal(isReadonly);
				});
			});
		});
		describe('get', () => {
			it('should return stored value', () => {
				expect(usersMap.get(userB), 'get1').to.equal(userA);
				expect(usersMap.get(userA), 'get2').to.equal(userB);
			});
			it('should return undefined if no stored value', () => {
				expect(usersMap.get({})).to.equal(undefined);
			});
			it('should return '+typeOfObj(isReadonly)+' entries', ()  => {
				expect(usersMap.get(userA).$isReadOnly()).to.equal(isReadonly);
			});
		});

		describe('has', () => {
			it('should return true if a value exists for supplied key', () => {
				expect(usersMap.has(userB)).to.equal(true);
				expect(usersMap.has(userA)).to.equal(true);
			});
			it('should return false if no stored value', () => {
				expect(usersMap.has({})).to.equal(false);
			});
		});

		describe('keys',() => {
			it('should return an array of the map keys', () => {
				var array = builders.aNumberMap({a: 1, b:2}).keys();
				expect(array).to.eql(['a', 'b']);
			});

			it('should expose '+typeOfObj(isReadonly)+' keys', ()  => {
				var element = usersMap.keys()[0];

				expect(element.$isReadOnly(), 'key is readOnly').to.equal(isReadonly);
			});
		});

		describe('set', () => {
			if (isReadonly) {
				it('should not change map', ()  => {
					const jsonModel = {a: 1};
					var numbers = builders.aNumberMap(jsonModel);
					numbers.set('a', 5);
					numbers.set('b', 5);
					expect(numbers.toJSON()).to.eql(jsonModel);
				});
			} else {
				it('should replace an existing element', ()  => {
					var numbers = builders.aNumberMap({a: 1});
					numbers.set('a', 5);
					expect(numbers.toJSON()).to.eql({a: 5});
				});
				it('should add an element if none exists', ()  => {
					var numbers = builders.aNumberMap();
					numbers.set('a', 42);
					expect(numbers.toJSON()).to.eql({a: 42});
				});
				it('should support a typorama object as an argument', ()  => {
					usersMap.set(userA, userA).set(userB, userA).set(userA, userB);

					// es6 vaguely defines order of elements in map.
					// if order definition breaks, consider using chai-things plugin for matching regardless of order
					// http://chaijs.com/plugins/chai-things
					expect(usersMap.toJSON(false)).to.eql([[userA, userB], [userB, userA]]);
				});
				lifeCycleAsserter.assertMutatorContract(
					(map, elemFactory) => map.set(elemFactory(), elemFactory()), 'set');
			}
			it('should return the map', () => {
				var numbers = builders.aNumberMap({a: 5});
				expect(numbers.set('a', 42)).to.equal(numbers);
			});
		});

		describe('values',() => {
			it('should return an array of the map values', () => {
				var array = builders.aNumberMap({a: 1, b:2}).values();
				expect(array).to.eql([1, 2]);
			});

			it('should expose '+typeOfObj(isReadonly)+' values', ()  => {
				var element = usersMap.values()[0];

				expect(element.$isReadOnly(), 'value is readOnly').to.equal(isReadonly);
			});
		});

		describe('setValue',() => {

			it('with same state should not change or get dirty if values are not changed', function () {
				revision.advance();
				var rev = revision.read();

				usersMap.setValue(usersMapInitialState);
				expect(Array.from(usersMap.__value__.entries()), 'entries array').to.eql(usersMapInitialState);
				expect(usersMap.$isDirty(rev)).to.be.false;
			});
			describe('with a new state', () => {
				let newValue, changeRevision;
				beforeEach('change value', () => {
					newValue = [[userA, userB], [userB, userB]];
					revision.advance();
					changeRevision = revision.read();
					usersMap.setValue(newValue);
				});
				if (isReadonly){
					it('should not change', function () {
						expect(Array.from(usersMap.__value__.entries()), 'entries array').to.eql(usersMapInitialState);
					});
					it('should not set map as dirty', function () {
						expect(usersMap.$isDirty(changeRevision)).to.be.false;
					});
				} else {
					it('should only leave the new state', function () {
						expect(usersMap.entries()).to.eql(newValue);
					});
					it('should set map as dirty', function () {
						expect(usersMap.$isDirty(changeRevision)).to.be.true;
					});
					lifeCycleAsserter.assertMutatorContract(
						(map, elemFactory) => map.setValue([[elemFactory(), elemFactory()]]), 'setValue');
				}
			});

		});
		describe('setValueDeep',() => {

			it('with same state should not change or get dirty if values are not changed', function () {
				revision.advance();
				var rev = revision.read();

				usersMap.setValueDeep(usersMapInitialState);
				expect(Array.from(usersMap.__value__.entries()), 'entries array').to.eql(usersMapInitialState);
				expect(usersMap.$isDirty(rev)).to.be.false;
			});
			describe('with a new state', () => {
				let userC, newValue, changeRevision;
				beforeEach('change value', () => {
					userC = new builders.UserType({name:'katanka'});

					newValue = [[userA, userB], [userB, userC], [userC, userA]];
					revision.advance();
					changeRevision = revision.read();
					usersMap.setValueDeep(newValue);
				});
				if (isReadonly){
					it('should not change', function () {
						expect(Array.from(usersMap.__value__.entries()), 'entries array').to.eql(usersMapInitialState);
					});
					it('should not set map as dirty', function () {
						expect(usersMap.$isDirty(changeRevision)).to.be.false;
					});
				} else {
					it('should change data of map to new state', function () {
						expect(usersMap.size).to.eql(3);
						expect(getNewUsers(usersMap.values()), 'values of map')
							.to.eql(getNewUsers(new Map(newValue).values()));
						expect(getNewUsers(usersMap.keys()), 'data of keys of map')
							.to.eql(getNewUsers(Array.from(new Map(newValue).keys())));
					});
					it('should not replace instances of existing mappings', function () {
						expect(usersMap.get(userA)).to.equal(userB);
						expect(usersMap.get(userB)).to.equal(userA);
					});
					it('should add new mappings if missing', function () {
						expect(usersMap.get(userC)).to.equal(userA);
					});
					it('should set map as dirty', function () {
						expect(usersMap.$isDirty(changeRevision)).to.be.true;
					});
					lifeCycleAsserter.assertMutatorContract(
						(map, elemFactory) => map.setValueDeep([[elemFactory(), elemFactory()]]), 'setValueDeep');
				}
			});

		});
	});
}

function typeOfObj(isReadonly){
	return isReadonly? 'read only' : 'mutable';
}

describe('Map', function() {
	testReadFunctionality(builders, false);
	testReadFunctionality(builders.asReadOnly(), true);
});
